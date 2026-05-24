import { getPlatform } from "../platform";
import {
  exportProjectBundle,
  importProjectBundle,
  openProject,
  persistPlatformProject,
} from "../platform/project-storage";
import { notifyWarning } from "./notifications";
import { canEditProject } from "./show-mode";

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

export async function saveProjectFile(): Promise<void> {
  if (!canEditProject()) return;
  if (getPlatform() === "tauri") {
    await persistPlatformProject();
    return;
  }
  const { missing } = await exportProjectBundle();
  if (missing.length > 0) {
    notifyWarning(`Exported, but ${missing.length} asset(s) were missing from storage.`);
  }
}
