import { notifyErrorFromUnknown } from "../lib/notifications";
import type { IdbProjectSummary } from "../lib/project-idb";
import type { RecentProjectEntry } from "../lib/recent-projects";
import { getPlatform } from "./index";

export async function listRecentProjects(): Promise<RecentProjectEntry[]> {
  if (getPlatform() !== "tauri") return [];
  const { listValidRecentProjects } = await import("./project-storage.tauri");
  return listValidRecentProjects();
}

export async function listStoredWebProjects(): Promise<IdbProjectSummary[]> {
  if (getPlatform() === "tauri") return [];
  const { listStoredProjects } = await import("../lib/project-session");
  return listStoredProjects();
}

export async function openStoredWebProject(projectId: string): Promise<boolean> {
  if (getPlatform() === "tauri") return false;
  const { withProjectLoading } = await import("../stores/project-loading");
  const { openStoredWebProject: openStored } = await import("./project-storage.web");
  return withProjectLoading(() => openStored(projectId));
}

export async function deleteStoredWebProject(projectId: string): Promise<boolean> {
  if (getPlatform() === "tauri") return false;
  const { withProjectLoading } = await import("../stores/project-loading");
  const { deleteStoredWebProject: deleteStored } = await import("./project-storage.web");
  return withProjectLoading(() => deleteStored(projectId));
}

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
  const { withProjectLoading } = await import("../stores/project-loading");
  const { importProjectBundleWeb } = await import("./project-storage.web");
  return withProjectLoading(() => importProjectBundleWeb(file));
}

export async function openProject(): Promise<boolean> {
  if (getPlatform() !== "tauri") return false;
  const { pickAndOpenProject } = await import("./project-storage.tauri");
  return pickAndOpenProject();
}

/** Tauri: open a `.gsc` project directory from an OS file path (e.g. native drag-and-drop). */
export async function openDroppedProjectDir(dirPath: string): Promise<boolean> {
  if (getPlatform() !== "tauri") return false;
  const { openProjectDirFromPath } = await import("./project-storage.tauri");
  return openProjectDirFromPath(dirPath);
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

/** Tauri: bind a draft project folder in app cache until the user saves. */
export async function bindTemporaryProjectRoot(showName?: string): Promise<string | null> {
  if (getPlatform() !== "tauri") return null;
  const { bindTemporaryProjectRoot: bindDraft } = await import("./project-storage.tauri");
  return bindDraft(showName);
}

/** Tauri: remove a draft project folder from app cache. */
export async function discardTemporaryProjectRoot(rootDir: string): Promise<void> {
  if (getPlatform() !== "tauri") return;
  const { discardTemporaryProjectRoot: discardDraft } = await import("./project-storage.tauri");
  await discardDraft(rootDir);
}

export async function persistPlatformProject(options?: {
  promptForLocation?: boolean;
  saveAs?: boolean;
}): Promise<void> {
  if (getPlatform() === "tauri") {
    const { persistTauriProject } = await import("./project-storage.tauri");
    await persistTauriProject(options);
    return;
  }
  const { persistProjectSessionAsync } = await import("../lib/project-session");
  await persistProjectSessionAsync();
}
