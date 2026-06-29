import { getPlatform } from "../platform";
import {
  bindTemporaryProjectRoot,
  discardTemporaryProjectRoot,
  persistPlatformProject,
} from "../platform/project-storage";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { requestUnsavedProjectChoice } from "../stores/unsaved-project-prompt";
import { saveProjectFile } from "./project-file-actions";
import { replaceWithFreshProject } from "./reset-project-runtime";
import { isProjectUnsaved } from "./unsaved-project";

const TAURI_LAST_ROOT_KEY = "gsc-tauri-last-project-root";

/** Save the open project, then replace it with a new empty show in edit mode. */
export async function startNewProject(): Promise<void> {
  const previousRoot = useProjectLocationStore.getState().rootDir;
  const wasTemporary = useProjectLocationStore.getState().isTemporaryRoot;

  if (getPlatform() === "tauri") {
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
  } else {
    await persistPlatformProject();
  }

  replaceWithFreshProject();

  if (getPlatform() === "tauri") {
    if (wasTemporary && previousRoot) {
      await discardTemporaryProjectRoot(previousRoot);
    }
    await bindTemporaryProjectRoot();
  } else {
    localStorage.removeItem(TAURI_LAST_ROOT_KEY);
  }
}
