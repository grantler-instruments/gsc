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
import { join } from "@tauri-apps/api/path";
import { setActiveProjectId } from "../lib/active-project-id";
import {
  buildProjectBundleZip,
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
import { prefetchMediaDurations } from "../lib/media-duration";
import { collectSessionAssetPaths } from "../lib/project-session";
import { snapshotToCueLists } from "../lib/project-snapshot";
import { BUNDLE_EXTENSION, PROJECT_JSON } from "../lib/project-paths";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useVfsStore } from "../stores/vfs";
import { vfsClear, vfsGet } from "../vfs/engine";
import { assetKindFromPath } from "../vfs/import";
import type { VfsEntry } from "../stores/vfs";

const LAST_ROOT_KEY = "gsc-tauri-last-project-root";

const IGNORED_DIR_ENTRIES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

let bindFolderPromise: Promise<string | null> | undefined;
let bundleOpenInProgress = false;

function showError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  window.alert(message);
}

async function assertDirectoryEmpty(dir: string): Promise<void> {
  if (!(await exists(dir))) return;
  const entries = await readDir(dir);
  const blocking = entries.filter((e) => !IGNORED_DIR_ENTRIES.has(e.name));
  if (blocking.length > 0) {
    throw new Error(
      "That folder is not empty. Choose an empty folder.",
    );
  }
}

async function pickEmptyProjectFolder(title: string): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title,
  });
  if (!selected || typeof selected !== "string") return null;
  await assertDirectoryEmpty(selected);
  return selected;
}

async function writeBundleFilesToFolder(
  rootDir: string,
  zipData: Uint8Array,
): Promise<void> {
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

async function collectRelativeFiles(
  dir: string,
  prefix = "",
): Promise<string[]> {
  const entries = await readDir(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory) {
      const nested = await collectRelativeFiles(
        await join(dir, entry.name),
        rel,
      );
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
        loaded: Boolean(blob),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

export async function loadProjectFromFolder(rootDir: string): Promise<void> {
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

  const assetsDir = await join(rootDir, "project");
  let diskPaths: string[] = [];
  if (await exists(assetsDir)) {
    const relFiles = await collectRelativeFiles(assetsDir, "project");
    diskPaths = virtualPathsFromRelativeFiles(relFiles);
  }

  const paths = collectSessionAssetPaths(snap, diskPaths.map((p) => ({ path: p })));
  const uniquePaths = [...new Set(paths)];

  await registerDiskAssetPaths(rootDir, uniquePaths, async (diskPath) =>
    exists(diskPath),
  );

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

  const paths = collectSessionAssetPaths(
    snapshot,
    useVfsStore.getState().entries,
  );

  await saveAllVfsAssetsToDisk(rootDir, paths, writeDiskFile, ensureDiskDir);

  const jsonPath = projectJsonDiskPath(rootDir);
  await writeTextFile(jsonPath, JSON.stringify(snapshot, null, 2));
}

async function openProjectBundleFromZipData(
  zipData: Uint8Array,
): Promise<boolean> {
  const destDir = await pickEmptyProjectFolder(
    "Choose an empty folder for this project",
  );
  if (!destDir) return false;

  await writeBundleFilesToFolder(destDir, zipData);
  await loadProjectFromFolder(destDir);
  return true;
}

/** Extract a dropped or chosen bundle into an empty folder and load it. */
export async function openProjectBundleFromPath(
  bundlePath: string,
): Promise<boolean> {
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

async function openProjectFromBundleFile(bundlePath: string): Promise<boolean> {
  return openProjectBundleFromPath(bundlePath);
}

/** Open an on-disk project folder or a .gsc.zip bundle (extracted to an empty folder). */
export async function pickAndOpenProject(): Promise<boolean> {
  const folderPath = await open({
    directory: true,
    multiple: false,
    title: "Open project",
  });
  if (typeof folderPath === "string") {
    try {
      await loadProjectFromFolder(folderPath);
      return true;
    } catch (err) {
      showError(err);
      return false;
    }
  }

  const bundlePath = await open({
    multiple: false,
    title: "Open project bundle",
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
      const folder = await pickEmptyProjectFolder(
        "Choose an empty folder for this project",
      );
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
    console.warn("[tauri] Could not restore last project", err);
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
    console.warn("[tauri] Could not autosave project", err);
    if (
      err instanceof Error &&
      err.message.includes("not empty")
    ) {
      showError(err);
    }
  }
}

export async function exportProjectBundleTauri(): Promise<boolean> {
  const snapshot = useProjectStore.getState().getSnapshot();
  if (snapshot.version !== 2) return false;

  const paths = collectSessionAssetPaths(
    snapshot,
    useVfsStore.getState().entries,
  );

  const { zip, missing } = await buildProjectBundleZip(snapshot, paths, vfsGet);
  if (missing.length > 0) {
    console.warn("[export] Missing assets:", missing);
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
export async function syncImportedAssetToDisk(
  virtualPath: string,
  blob: Blob,
): Promise<void> {
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
