import { t } from "../i18n/t";
import { useFadeStore } from "../stores/fade";
import { usePlaybackStore } from "../stores/playback";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import { useVfsStore } from "../stores/vfs";
import { vfsClear } from "../vfs/engine";
import { setActiveProjectId } from "./active-project-id";
import { createCueList } from "./cue-lists";
import { replaceProjectWithoutHistory } from "./project-history";
import { randomId } from "./random-id";

function createFreshProjectState(projectName = t("project.defaultName")) {
  const list = createCueList(t("project.defaultListName"));
  const id = randomId();
  setActiveProjectId(id);
  return {
    id,
    name: projectName,
    cueLists: [list],
    activeCueListId: list.id,
  };
}

/** Reset runtime state to a new empty show without prompts or persistence. */
export function replaceWithFreshProject(projectName = t("project.defaultName")): void {
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
    useProjectStore.setState(createFreshProjectState(projectName));
  });
  useVfsStore.setState({ entries: [] });
  useUiStore.getState().setShowMode(false);
  useProjectLocationStore.getState().setRootDir(null);
}
