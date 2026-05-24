import { getPlatform } from "../platform";
import {
  discardTemporaryProjectRoot,
  exportProjectBundle,
  importProjectBundle,
  openDroppedProjectDir,
  openProject,
  persistPlatformProject,
} from "../platform/project-storage";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { requestUnsavedProjectChoice } from "../stores/unsaved-project-prompt";
import { notifyWarning } from "./notifications";
import { canEditProject } from "./show-mode";
import { isProjectUnsaved } from "./unsaved-project";

function openWebBundlePicker(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".zip,.gsc.zip,application/zip";
  input.hidden = true;
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) {
      void importProjectBundle(file);
    }
    input.remove();
  };
  document.body.appendChild(input);
  input.click();
}

export async function openProjectFile(): Promise<void> {
  if (!canEditProject()) return;
  if (getPlatform() === "tauri") {
    await openProject();
    return;
  }
  openWebBundlePicker();
}

export async function openRecentProjectPath(path: string): Promise<void> {
  if (!canEditProject()) return;
  if (getPlatform() !== "tauri") return;

  if (isProjectUnsaved()) {
    const choice = await requestUnsavedProjectChoice(useProjectStore.getState().name);
    if (choice === "cancel") return;
    if (choice === "save") {
      await saveProjectFile();
      if (useProjectLocationStore.getState().isTemporaryRoot) return;
    }
    const { rootDir, isTemporaryRoot } = useProjectLocationStore.getState();
    if (isTemporaryRoot && rootDir) {
      await discardTemporaryProjectRoot(rootDir);
    }
  } else {
    await persistPlatformProject();
  }

  const opened = await openDroppedProjectDir(path);
  if (!opened) {
    notifyWarning("Could not open the selected project.");
  }
}

export async function saveProjectFile(): Promise<void> {
  if (!canEditProject()) return;
  if (getPlatform() === "tauri") {
    await persistPlatformProject({ promptForLocation: true });
    return;
  }
  const { missing } = await exportProjectBundle();
  if (missing.length > 0) {
    notifyWarning(`Exported, but ${missing.length} asset(s) were missing from storage.`);
  }
}
