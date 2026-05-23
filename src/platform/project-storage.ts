import { notifyErrorFromUnknown } from "../lib/notifications";
import { getPlatform } from "./index";

export async function exportProjectBundle(): Promise<{ missing: string[] }> {
  if (getPlatform() === "tauri") {
    const { exportProjectBundleTauri } = await import("./project-storage.tauri");
    await exportProjectBundleTauri();
    return { missing: [] };
  }
  const { exportProjectBundleWeb } = await import("./project-storage.web");
  return exportProjectBundleWeb();
}

export async function importProjectBundle(file?: File): Promise<void> {
  if (!file) return;
  const { importProjectBundleWeb } = await import("./project-storage.web");
  return importProjectBundleWeb(file);
}

export async function openProject(): Promise<boolean> {
  if (getPlatform() !== "tauri") return false;
  const { pickAndOpenProject } = await import("./project-storage.tauri");
  return pickAndOpenProject();
}

/** Tauri: open a .gsc.zip from an OS file path (e.g. native drag-and-drop). */
export async function openDroppedProjectBundle(bundlePath: string): Promise<boolean> {
  if (getPlatform() !== "tauri") return false;
  const { openProjectBundleFromPath } = await import("./project-storage.tauri");
  return openProjectBundleFromPath(bundlePath);
}

/** Tauri: open a .gsc.zip from an HTML5 File drop. */
export async function openDroppedProjectBundleFile(file: File): Promise<boolean> {
  if (getPlatform() !== "tauri") return false;
  const { openProjectBundleFromFile } = await import("./project-storage.tauri");
  return openProjectBundleFromFile(file);
}

export async function restorePlatformProject(): Promise<boolean> {
  if (getPlatform() === "tauri") {
    const { restoreLastTauriProject } = await import("./project-storage.tauri");
    return restoreLastTauriProject();
  }
  const { restoreProjectSessionOnce } = await import("../lib/project-session");
  await restoreProjectSessionOnce();
  return false;
}

/** Tauri: save dialog to pick parent path + folder name; creates the directory. */
export async function promptProjectFolder(
  title: string,
  defaultName: string,
): Promise<string | null> {
  if (getPlatform() !== "tauri") return null;
  const { promptTauriProjectFolder } = await import("./project-storage.tauri");
  try {
    return await promptTauriProjectFolder(title, defaultName);
  } catch (err) {
    notifyErrorFromUnknown(err);
    return null;
  }
}

export async function persistPlatformProject(): Promise<void> {
  if (getPlatform() === "tauri") {
    const { persistTauriProject } = await import("./project-storage.tauri");
    await persistTauriProject();
    return;
  }
  const { persistProjectSession } = await import("../lib/project-session");
  persistProjectSession();
}
