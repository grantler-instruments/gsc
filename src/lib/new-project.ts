import { createCueList } from "./cue-lists";
import { setActiveProjectId } from "./active-project-id";
import { getPlatform } from "../platform";
import {
  persistPlatformProject,
  promptProjectFolder,
} from "../platform/project-storage";
import { usePlaybackStore } from "../stores/playback";
import { useProjectLocationStore } from "../stores/project-location";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import { useVfsStore } from "../stores/vfs";
import { useFadeStore } from "../stores/fade";
import { vfsClear } from "../vfs/engine";

const TAURI_LAST_ROOT_KEY = "gsc-tauri-last-project-root";

function showNameFromFolderPath(rootDir: string): string {
  const base =
    rootDir.replace(/[/\\]+$/, "").split(/[/\\]/).pop() ?? "Untitled_Show";
  const name = base.replace(/_/g, " ").trim();
  return name || "Untitled Show";
}

function createFreshProjectState(projectName = "Untitled Show") {
  const list = createCueList("Main");
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
  await persistPlatformProject();

  let rootDir: string | null = null;
  if (getPlatform() === "tauri") {
    rootDir = await promptProjectFolder("New Project", "Untitled Show");
    if (!rootDir) return;
  }

  useTransportStore.getState().panic();
  usePlaybackStore.getState().clear();
  useFadeStore.setState({ fadesByTargetId: {}, frameMs: 0 });

  vfsClear();
  const projectName = rootDir ? showNameFromFolderPath(rootDir) : "Untitled Show";
  useProjectStore.setState(createFreshProjectState(projectName));
  useVfsStore.setState({ entries: [] });
  useUiStore.getState().setShowMode(false);

  if (rootDir) {
    useProjectLocationStore.getState().setRootDir(rootDir);
    localStorage.setItem(TAURI_LAST_ROOT_KEY, rootDir);
    await persistPlatformProject();
  } else {
    useProjectLocationStore.getState().setRootDir(null);
    if (getPlatform() === "tauri") {
      localStorage.removeItem(TAURI_LAST_ROOT_KEY);
    }
  }
}
