import { t } from "../i18n/t";
import { getPlatform } from "../platform";
import {
  bindTemporaryProjectRoot,
  discardTemporaryProjectRoot,
  persistPlatformProject,
} from "../platform/project-storage";
import { useFadeStore } from "../stores/fade";
import { usePlaybackStore } from "../stores/playback";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import { requestUnsavedProjectChoice } from "../stores/unsaved-project-prompt";
import { useVfsStore } from "../stores/vfs";
import { vfsClear } from "../vfs/engine";
import { setActiveProjectId } from "./active-project-id";
import { createCueList } from "./cue-lists";
import { saveProjectFile } from "./project-file-actions";
import { replaceProjectWithoutHistory } from "./project-history";
import { isProjectUnsaved } from "./unsaved-project";

const TAURI_LAST_ROOT_KEY = "gsc-tauri-last-project-root";

function createFreshProjectState(projectName = t("project.defaultName")) {
  const list = createCueList(t("project.defaultListName"));
  const id = crypto.randomUUID();
  setActiveProjectId(id);
  return {
    id,
    name: projectName,
    cueLists: [list],
    activeCueListId: list.id,
  };
}

/** Save the open project, then replace it with a new empty show in edit mode. */
export async function startNewProject(): Promise<void> {
  const previousRoot = useProjectLocationStore.getState().rootDir;
  const wasTemporary = useProjectLocationStore.getState().isTemporaryRoot;

  if (isProjectUnsaved()) {
    const choice = await requestUnsavedProjectChoice(useProjectStore.getState().name);
    if (choice === "cancel") return;
    if (choice === "save") {
      await saveProjectFile();
      if (useProjectLocationStore.getState().isTemporaryRoot) return;
    }
  } else if (!wasTemporary && previousRoot) {
    await persistPlatformProject();
  }

  useTransportStore.getState().panic();
  usePlaybackStore.getState().clear();
  useFadeStore.setState({
    fadesByTargetId: {},
    dmxFadesByFadeCueId: {},
    runtimeLevelsByTargetId: {},
    frameMs: 0,
  });

  vfsClear();
  replaceProjectWithoutHistory(() => {
    useProjectStore.setState(createFreshProjectState());
  });
  useVfsStore.setState({ entries: [] });
  useUiStore.getState().setShowMode(false);

  if (getPlatform() === "tauri") {
    if (wasTemporary && previousRoot) {
      await discardTemporaryProjectRoot(previousRoot);
    }
    await bindTemporaryProjectRoot();
  } else {
    useProjectLocationStore.getState().setRootDir(null);
    localStorage.removeItem(TAURI_LAST_ROOT_KEY);
  }
}
