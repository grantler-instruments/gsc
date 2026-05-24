import { join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  remove,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { setActiveProjectId } from "../lib/active-project-id";
import { prefetchMediaDurations } from "../lib/media-duration";
import { notifyErrorFromUnknown, notifyWarning, notifyWarningDeduped } from "../lib/notifications";
import {
  buildProjectBundleZip,
  parseProjectBundleZip,
  projectBundleDiskFiles,
} from "../lib/project-bundle";
import {
  diskPathForAsset,
  projectJsonDiskPath,
  registerDiskAssetPaths,
  saveAllVfsAssetsToDisk,
  virtualPathsFromRelativeFiles,
  writeAssetToDisk,
} from "../lib/project-disk";
import { isMacPlatform } from "../lib/keyboard";
import {
  BUNDLE_EXTENSION,
  isGscProjectDirPath,
  isProjectBundlePath,
  PROJECT_DIR_EXTENSION,
  PROJECT_JSON,
  projectDirNameFromShowName,
  projectRootFromSavePath,
} from "../lib/project-paths";
import { collectSessionAssetPaths } from "../lib/project-session";
import { snapshotToCueLists } from "../lib/project-snapshot";
import { markGscProjectPackage } from "./macos-package";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import type { VfsEntry } from "../stores/vfs";
import { useVfsStore } from "../stores/vfs";
import { vfsClear, vfsGet, vfsHas } from "../vfs/engine";
import { assetKindFromPath } from "../vfs/import";

const LAST_ROOT_KEY = "gsc-tauri-last-project-root";

const IGNORED_DIR_ENTRIES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

let bindFolderPromise: Promise<string | null> | undefined;
let bundleOpenInProgress = false;

function showError(err: unknown): void {
  notifyErrorFromUnknown(err);
}

async function isDirectoryEmpty(dir: string): Promise<boolean> {
  if (!(await exists(dir))) return true;
  const entries = await readDir(dir);
  return entries.filter((e) => !IGNORED_DIR_ENTRIES.has(e.name)).length === 0;
}

/**
 * Save dialog: user picks location and folder name; GSC creates a `.gsc` directory.
 */
export async function promptTauriProjectFolder(
  title: string,
  defaultName: string,
): Promise<string | null> {
  const selected = await save({
    title,
    defaultPath: projectDirNameFromShowName(defaultName),
    canCreateDirectories: true,
  });
  if (!selected || typeof selected !== "string") return null;

  const rootDir = projectRootFromSavePath(selected);

  if (await exists(rootDir)) {
    if (!(await isDirectoryEmpty(rootDir))) {
      throw new Error(
        `“${rootDir}” already exists and is not empty. Choose another name or location.`,
      );
    }
    return rootDir;
  }

  await mkdir(rootDir, { recursive: true });
  await markGscProjectPackage(rootDir);
  return rootDir;
}

async function writeBundleFilesToFolder(rootDir: string, zipData: Uint8Array): Promise<void> {
  const { files } = projectBundleDiskFiles(zipData);
  const sep = rootDir.includes("\\") ? "\\" : "/";
  const base = rootDir.replace(/[/\\]+$/, "");

  for (const { relativePath, data } of files) {
    const diskPath = `${base}${sep}${relativePath.replace(/\//g, sep)}`;
    const dir = diskPath.replace(/[/\\][^/\\]+$/, "");
    await ensureDiskDir(dir);
    await writeDiskFile(diskPath, data);
  }
}

async function writeDiskFile(diskPath: string, data: Uint8Array): Promise<void> {
  await writeFile(diskPath, data);
}

async function ensureDiskDir(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
}

async function collectRelativeFiles(dir: string, prefix = ""): Promise<string[]> {
  const entries = await readDir(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory) {
      const nested = await collectRelativeFiles(await join(dir, entry.name), rel);
      files.push(...nested);
    } else {
      files.push(rel);
    }
  }
  return files;
}

function vfsEntriesFromPaths(paths: string[]): VfsEntry[] {
  return paths
    .map((path) => {
      const name = path.split("/").pop() ?? path;
      const blob = vfsGet(path);
      return {
        path,
        name,
        size: blob?.size ?? 0,
        mimeType: blob?.type ?? "",
        kind: assetKindFromPath(path),
        loaded: vfsHas(path),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

export async function loadProjectFromFolder(rootDir: string): Promise<void> {
  if (!isGscProjectDirPath(rootDir)) {
    throw new Error(`Select a ${PROJECT_DIR_EXTENSION} project folder (e.g. MyShow${PROJECT_DIR_EXTENSION}).`);
  }

  const jsonPath = projectJsonDiskPath(rootDir);
  if (!(await exists(jsonPath))) {
    throw new Error(`No ${PROJECT_JSON} in selected folder`);
  }

  const text = await readTextFile(jsonPath);
  const snap = JSON.parse(text);
  if (snap.version !== 2) {
    throw new Error("Unsupported project version");
  }

  vfsClear();
  const loaded = snapshotToCueLists(snap);
  setActiveProjectId(loaded.id);
  useProjectStore.setState(loaded);
  useProjectLocationStore.getState().setRootDir(rootDir);
  localStorage.setItem(LAST_ROOT_KEY, rootDir);
  await markGscProjectPackage(rootDir);

  const assetsDir = await join(rootDir, "assets");
  let diskPaths: string[] = [];
  if (await exists(assetsDir)) {
    const relFiles = await collectRelativeFiles(assetsDir, "assets");
    diskPaths = virtualPathsFromRelativeFiles(relFiles);
  }

  const paths = collectSessionAssetPaths(
    snap,
    diskPaths.map((p) => ({ path: p })),
  );
  const uniquePaths = [...new Set(paths)];

  await registerDiskAssetPaths(rootDir, uniquePaths, async (diskPath) => exists(diskPath));

  useVfsStore.setState({ entries: vfsEntriesFromPaths(uniquePaths) });
  prefetchMediaDurations(
    uniquePaths.filter((p) => {
      const kind = assetKindFromPath(p);
      return kind === "audio" || kind === "video";
    }),
  );
}

export async function saveProjectToFolder(rootDir: string): Promise<void> {
  const snapshot = useProjectStore.getState().getSnapshot();
  if (snapshot.version !== 2) return;

  const paths = collectSessionAssetPaths(snapshot, useVfsStore.getState().entries);

  await saveAllVfsAssetsToDisk(rootDir, paths, writeDiskFile, ensureDiskDir);

  const jsonPath = projectJsonDiskPath(rootDir);
  await writeTextFile(jsonPath, JSON.stringify(snapshot, null, 2));
  await markGscProjectPackage(rootDir);
}

async function openProjectBundleFromZipData(zipData: Uint8Array): Promise<boolean> {
  const { snapshot } = parseProjectBundleZip(zipData);
  const destDir = await promptTauriProjectFolder("Save project as", snapshot.name);
  if (!destDir) return false;

  await writeBundleFilesToFolder(destDir, zipData);
  await loadProjectFromFolder(destDir);
  return true;
}

/** Open a `.gsc` project directory from an OS file path (e.g. drag-and-drop). */
export async function openProjectDirFromPath(dirPath: string): Promise<boolean> {
  try {
    await loadProjectFromFolder(dirPath);
    return true;
  } catch (err) {
    showError(err);
    return false;
  }
}

/** Extract a dropped or chosen bundle into a new `.gsc` folder and load it. */
export async function openProjectBundleFromPath(bundlePath: string): Promise<boolean> {
  if (bundleOpenInProgress) return false;
  bundleOpenInProgress = true;
  try {
    const zipData = await readFile(bundlePath);
    return await openProjectBundleFromZipData(zipData);
  } catch (err) {
    showError(err);
    return false;
  } finally {
    bundleOpenInProgress = false;
  }
}

/** HTML5 file drop (no OS path) — read bundle bytes from the File object. */
export async function openProjectBundleFromFile(file: File): Promise<boolean> {
  if (bundleOpenInProgress) return false;
  bundleOpenInProgress = true;
  try {
    const zipData = new Uint8Array(await file.arrayBuffer());
    return await openProjectBundleFromZipData(zipData);
  } catch (err) {
    showError(err);
    return false;
  } finally {
    bundleOpenInProgress = false;
  }
}

async function openProjectFromBundleFile(bundlePath: string): Promise<boolean> {
  return openProjectBundleFromPath(bundlePath);
}

async function openPickedProjectPath(path: string): Promise<boolean> {
  if (isProjectBundlePath(path)) {
    return openProjectFromBundleFile(path);
  }
  if (isGscProjectDirPath(path)) {
    return openProjectDirFromPath(path);
  }
  notifyWarning(`Choose a ${PROJECT_DIR_EXTENSION} project or ${BUNDLE_EXTENSION} bundle.`);
  return false;
}

/** Open a `.gsc` project directory or import a `.gsc.zip` bundle. */
export async function pickAndOpenProject(): Promise<boolean> {
  // macOS `.gsc` folders are packages (LSTypeIsPackage) and cannot be chosen in a
  // directory-only picker — use a file picker so packages appear as selectable `.gsc` items.
  if (isMacPlatform()) {
    const selected = await open({
      multiple: false,
      title: "Open project",
      filters: [
        { name: "GSC project", extensions: ["gsc"] },
        { name: "GSC project bundle", extensions: ["gsc.zip", "zip"] },
      ],
    });
    if (typeof selected !== "string") return false;
    try {
      return await openPickedProjectPath(selected);
    } catch (err) {
      showError(err);
      return false;
    }
  }

  const folderPath = await open({
    directory: true,
    multiple: false,
    title: `Open project (${PROJECT_DIR_EXTENSION} folder)`,
  });
  if (typeof folderPath === "string") {
    return openProjectDirFromPath(folderPath);
  }

  const bundlePath = await open({
    multiple: false,
    title: "Import project bundle",
    filters: [{ name: "GSC project bundle", extensions: ["gsc.zip", "zip"] }],
  });
  if (typeof bundlePath !== "string") return false;

  try {
    return await openProjectFromBundleFile(bundlePath);
  } catch (err) {
    showError(err);
    return false;
  }
}

async function ensureProjectRootDirForSave(): Promise<string | null> {
  const current = useProjectLocationStore.getState().rootDir;
  if (current) return current;

  if (!bindFolderPromise) {
    bindFolderPromise = (async () => {
      const showName = useProjectStore.getState().name;
      const folder = await promptTauriProjectFolder("Save project as", showName);
      if (!folder) return null;
      useProjectLocationStore.getState().setRootDir(folder);
      localStorage.setItem(LAST_ROOT_KEY, folder);
      return folder;
    })().finally(() => {
      bindFolderPromise = undefined;
    });
  }
  return bindFolderPromise;
}

export async function restoreLastTauriProject(): Promise<boolean> {
  const rootDir = localStorage.getItem(LAST_ROOT_KEY);
  if (!rootDir) {
    setActiveProjectId(useProjectStore.getState().id);
    return false;
  }

  try {
    if (!(await exists(projectJsonDiskPath(rootDir)))) {
      localStorage.removeItem(LAST_ROOT_KEY);
      setActiveProjectId(useProjectStore.getState().id);
      return false;
    }
    await loadProjectFromFolder(rootDir);
    return true;
  } catch (err) {
    notifyWarning("Could not restore the last project.");
    localStorage.removeItem(LAST_ROOT_KEY);
    setActiveProjectId(useProjectStore.getState().id);
    return false;
  }
}

export async function persistTauriProject(): Promise<void> {
  try {
    const rootDir = await ensureProjectRootDirForSave();
    if (!rootDir) return;
    await saveProjectToFolder(rootDir);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      showError(err);
    } else {
      notifyWarningDeduped("Could not autosave the project.");
    }
  }
}

export async function exportProjectBundleTauri(): Promise<boolean> {
  const snapshot = useProjectStore.getState().getSnapshot();
  if (snapshot.version !== 2) return false;

  const paths = collectSessionAssetPaths(snapshot, useVfsStore.getState().entries);

  const { zip, missing } = await buildProjectBundleZip(snapshot, paths, vfsGet);
  if (missing.length > 0) {
    notifyWarning(`Exported, but ${missing.length} asset(s) were missing from storage.`);
  }

  const base = snapshot.name.replace(/[^\w.-]+/g, "_") || "show";
  const path = await save({
    title: "Export project",
    defaultPath: `${base}${BUNDLE_EXTENSION}`,
    filters: [{ name: "GSC project bundle", extensions: ["gsc.zip", "zip"] }],
  });
  if (!path) return false;

  await writeFile(path, zip);
  return true;
}

/** Write imported blob to disk when a project folder is bound. */
export async function syncImportedAssetToDisk(virtualPath: string, blob: Blob): Promise<void> {
  const rootDir = useProjectLocationStore.getState().rootDir;
  if (!rootDir) return;
  await writeAssetToDisk(rootDir, virtualPath, blob, writeDiskFile, ensureDiskDir);
}

export async function removeAssetFromDisk(virtualPath: string): Promise<void> {
  const rootDir = useProjectLocationStore.getState().rootDir;
  if (!rootDir) return;
  const diskPath = diskPathForAsset(rootDir, virtualPath);
  try {
    if (await exists(diskPath)) {
      await remove(diskPath);
    }
  } catch {
    /* ignore */
  }
}
