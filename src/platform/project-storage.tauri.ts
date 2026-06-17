import { appCacheDir, join } from "@tauri-apps/api/path";
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
import { t } from "../i18n/t";
import { setActiveProjectId } from "../lib/active-project-id";
import { isMacPlatform } from "../lib/keyboard";
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
import { replaceProjectWithoutHistory } from "../lib/project-history";
import {
  BUNDLE_EXTENSION,
  isGscProjectDirPath,
  isProjectBundlePath,
  PROJECT_DIR_EXTENSION,
  projectDirNameFromShowName,
  projectRootFromSavePath,
} from "../lib/project-paths";
import { collectSessionAssetPaths } from "../lib/project-session";
import { snapshotToCueLists } from "../lib/project-snapshot";
import { isQlab5WorkspacePath } from "../lib/qlab5/import-qlab5-project";
import { confirmAndImportQlab5Path } from "../lib/qlab5-import-actions";
import { randomId } from "../lib/random-id";
import type { RecentProjectEntry } from "../lib/recent-projects";
import {
  readRecentProjects,
  recordRecentProject,
  removeRecentProject,
} from "../lib/recent-projects";
import { hasMeaningfulProjectContent, snapshotHasMeaningfulContent } from "../lib/unsaved-project";
import { useProjectStore } from "../stores/project";
import { useProjectLoadingStore } from "../stores/project-loading";
import { useProjectLocationStore } from "../stores/project-location";
import type { PendingDraftProject } from "../stores/startup-projects-prompt";
import { requestStartupProjectsChoice } from "../stores/startup-projects-prompt";
import type { VfsEntry } from "../stores/vfs";
import { useVfsStore } from "../stores/vfs";
import { vfsClear, vfsGet, vfsHas } from "../vfs/engine";
import { assetKindFromPath } from "../vfs/import";
import { markGscProjectPackage } from "./macos-package";

const LAST_ROOT_KEY = "gsc-tauri-last-project-root";
const DRAFT_ROOT_KEY = "gsc-tauri-draft-root";

const IGNORED_DIR_ENTRIES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

async function createDraftProjectRoot(showName: string): Promise<string> {
  const sessionDir = await join(await appCacheDir(), "drafts", randomId());
  const rootDir = await join(sessionDir, projectDirNameFromShowName(showName));
  await mkdir(rootDir, { recursive: true });
  await markGscProjectPackage(rootDir);
  return rootDir;
}

async function removeDraftProjectRoot(rootDir: string): Promise<void> {
  try {
    const normalized = rootDir.replace(/\\/g, "/");
    const draftsMarker = "/drafts/";
    const draftsIdx = normalized.indexOf(draftsMarker);
    if (draftsIdx < 0) return;

    const afterDrafts = normalized.slice(draftsIdx + draftsMarker.length);
    const sessionId = afterDrafts.split("/")[0];
    if (!sessionId) return;

    const sessionRoot = `${normalized.slice(0, draftsIdx + draftsMarker.length)}${sessionId}`;
    await remove(sessionRoot, { recursive: true });
  } catch {
    /* ignore cleanup failures */
  }
}

/** Bind a draft `.gsc` folder in app cache (autosaved until the user picks a location). */
export async function bindTemporaryProjectRoot(showName?: string): Promise<string> {
  const name = showName ?? useProjectStore.getState().name;
  const rootDir = await createDraftProjectRoot(name);
  useProjectLocationStore.getState().setRootDir(rootDir, { temporary: true });
  await saveProjectToFolder(rootDir);
  return rootDir;
}

export async function discardTemporaryProjectRoot(rootDir: string): Promise<void> {
  clearDraftRootKey(rootDir);
  await removeDraftProjectRoot(rootDir);
}

function clearDraftRootKey(rootDir?: string): void {
  const stored = localStorage.getItem(DRAFT_ROOT_KEY);
  if (!stored) return;
  if (!rootDir || stored === rootDir) {
    localStorage.removeItem(DRAFT_ROOT_KEY);
  }
}

function syncDraftRootKey(): void {
  const { rootDir, isTemporaryRoot } = useProjectLocationStore.getState();
  if (isTemporaryRoot && rootDir && hasMeaningfulProjectContent()) {
    localStorage.setItem(DRAFT_ROOT_KEY, rootDir);
    return;
  }
  localStorage.removeItem(DRAFT_ROOT_KEY);
}

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
      throw new Error(t("notification.pathExistsError", { path: rootDir }));
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

export async function loadProjectFromFolder(
  rootDir: string,
  options?: { temporary?: boolean },
): Promise<void> {
  if (!isGscProjectDirPath(rootDir)) {
    throw new Error(t("notification.selectGscFolder"));
  }

  const { rootDir: previousRoot, isTemporaryRoot } = useProjectLocationStore.getState();
  const temporary = options?.temporary ?? false;

  const jsonPath = projectJsonDiskPath(rootDir);
  if (!(await exists(jsonPath))) {
    throw new Error(t("notification.noProjectJson"));
  }

  const text = await readTextFile(jsonPath);
  const snap = JSON.parse(text);
  if (snap.version !== 2) {
    throw new Error(t("notification.unsupportedVersion"));
  }

  vfsClear();
  const loaded = snapshotToCueLists(snap);
  replaceProjectWithoutHistory(() => {
    setActiveProjectId(loaded.id);
    useProjectStore.setState(loaded);
  });
  useProjectLocationStore.getState().setRootDir(rootDir, { temporary });
  if (temporary) {
    syncDraftRootKey();
  } else {
    localStorage.setItem(LAST_ROOT_KEY, rootDir);
    localStorage.removeItem(DRAFT_ROOT_KEY);
    recordRecentProject(rootDir, loaded.name);
  }
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

  const { initAssetProgress, setAssetStatus } = useProjectLoadingStore.getState();
  initAssetProgress(uniquePaths.map((path) => ({ path })));
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  await registerDiskAssetPaths(rootDir, uniquePaths, async (diskPath) => exists(diskPath), {
    onPathStart: (path) => setAssetStatus(path, "loading"),
    onPathComplete: (path, loaded) => setAssetStatus(path, loaded ? "loaded" : "missing"),
  });

  useVfsStore.setState({ entries: vfsEntriesFromPaths(uniquePaths) });
  prefetchMediaDurations(
    uniquePaths.filter((p) => {
      const kind = assetKindFromPath(p);
      return kind === "audio" || kind === "video";
    }),
  );

  if (previousRoot && isTemporaryRoot && previousRoot !== rootDir) {
    await removeDraftProjectRoot(previousRoot);
  }
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
  const destDir = await promptTauriProjectFolder(
    t("notification.dialogSaveProjectAs"),
    snapshot.name,
  );
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
  if (isQlab5WorkspacePath(path)) {
    return confirmAndImportQlab5Path(path);
  }
  notifyWarning(
    t("notification.chooseProjectType", {
      projectExt: PROJECT_DIR_EXTENSION,
      bundleExt: BUNDLE_EXTENSION,
    }),
  );
  return false;
}

async function openPickedFolderPath(folderPath: string): Promise<boolean> {
  if (isGscProjectDirPath(folderPath)) {
    return openProjectDirFromPath(folderPath);
  }
  const { findQlab5WorkspaceInDirectory } = await import("./qlab5-import.tauri");
  const workspacePath = await findQlab5WorkspaceInDirectory(folderPath);
  if (workspacePath) {
    return confirmAndImportQlab5Path(folderPath);
  }
  notifyWarning(
    t("notification.chooseProjectType", {
      projectExt: PROJECT_DIR_EXTENSION,
      bundleExt: BUNDLE_EXTENSION,
    }),
  );
  return false;
}

/** Open a `.gsc` project directory or import a `.gsc.zip` bundle. */
export async function pickAndOpenProject(): Promise<boolean> {
  // macOS `.gsc` folders are packages (LSTypeIsPackage) and cannot be chosen in a
  // directory-only picker — use a file picker so packages appear as selectable `.gsc` items.
  if (isMacPlatform()) {
    const selected = await open({
      multiple: false,
      title: t("notification.dialogOpenProject"),
      filters: [
        { name: "GSC project", extensions: ["gsc"] },
        { name: "GSC project bundle", extensions: ["gsc.zip", "zip"] },
        { name: "QLab 5 workspace", extensions: ["qlab5"] },
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
    title: t("notification.dialogOpenProjectFolder"),
  });
  if (typeof folderPath === "string") {
    return openPickedFolderPath(folderPath);
  }

  const bundlePath = await open({
    multiple: false,
    title: t("notification.dialogImportBundle"),
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

async function promptAndCommitProjectLocation(): Promise<string | null> {
  if (!bindFolderPromise) {
    bindFolderPromise = (async () => {
      const { rootDir: previousRoot, isTemporaryRoot } = useProjectLocationStore.getState();
      const showName = useProjectStore.getState().name;
      const folder = await promptTauriProjectFolder(
        t("notification.dialogSaveProjectAs"),
        showName,
      );
      if (!folder) return null;
      useProjectLocationStore.getState().setRootDir(folder, { temporary: false });
      localStorage.setItem(LAST_ROOT_KEY, folder);
      localStorage.removeItem(DRAFT_ROOT_KEY);
      recordRecentProject(folder, showName);
      if (previousRoot && isTemporaryRoot) {
        await removeDraftProjectRoot(previousRoot);
      }
      return folder;
    })().finally(() => {
      bindFolderPromise = undefined;
    });
  }
  return bindFolderPromise;
}

async function resolveProjectRootDir(options?: {
  promptForLocation?: boolean;
}): Promise<string | null> {
  const { rootDir, isTemporaryRoot } = useProjectLocationStore.getState();

  if (options?.promptForLocation) {
    if (rootDir && !isTemporaryRoot) return rootDir;
    return promptAndCommitProjectLocation();
  }

  if (rootDir) return rootDir;
  return bindTemporaryProjectRoot();
}

async function draftHasRestorableContent(rootDir: string): Promise<boolean> {
  const jsonPath = projectJsonDiskPath(rootDir);
  if (!(await exists(jsonPath))) return false;

  try {
    const snap = JSON.parse(await readTextFile(jsonPath));
    if (snap.version !== 2) return false;
    if (snapshotHasMeaningfulContent(snap)) return true;

    const assetsDir = await join(rootDir, "assets");
    if (!(await exists(assetsDir))) return false;
    const entries = await readDir(assetsDir);
    return entries.some((entry) => !IGNORED_DIR_ENTRIES.has(entry.name));
  } catch {
    return false;
  }
}

async function getPendingDraftInfo(): Promise<PendingDraftProject | null> {
  const draftRoot = localStorage.getItem(DRAFT_ROOT_KEY);
  if (!draftRoot) return null;

  if (!(await exists(projectJsonDiskPath(draftRoot)))) {
    localStorage.removeItem(DRAFT_ROOT_KEY);
    await removeDraftProjectRoot(draftRoot);
    return null;
  }

  if (!(await draftHasRestorableContent(draftRoot))) {
    localStorage.removeItem(DRAFT_ROOT_KEY);
    await removeDraftProjectRoot(draftRoot);
    return null;
  }

  let projectName = t("project.defaultName");
  try {
    const snap = JSON.parse(await readTextFile(projectJsonDiskPath(draftRoot)));
    if (typeof snap.name === "string" && snap.name.trim()) {
      projectName = snap.name;
    }
  } catch {
    /* use default name */
  }

  return { path: draftRoot, name: projectName };
}

async function discardPendingDraft(draftPath: string): Promise<void> {
  localStorage.removeItem(DRAFT_ROOT_KEY);
  await removeDraftProjectRoot(draftPath);
}

async function ensureRecentsMigratedFromLastRoot(): Promise<void> {
  if (readRecentProjects().length > 0) return;

  const lastRoot = localStorage.getItem(LAST_ROOT_KEY);
  if (!lastRoot || !(await exists(projectJsonDiskPath(lastRoot)))) return;

  try {
    const snap = JSON.parse(await readTextFile(projectJsonDiskPath(lastRoot)));
    const name =
      typeof snap.name === "string" && snap.name.trim() ? snap.name : t("project.defaultName");
    recordRecentProject(lastRoot, name);
  } catch {
    recordRecentProject(lastRoot, t("project.defaultName"));
  }
}

export async function listValidRecentProjects(): Promise<RecentProjectEntry[]> {
  await ensureRecentsMigratedFromLastRoot();

  const valid: RecentProjectEntry[] = [];
  for (const entry of readRecentProjects()) {
    if (await exists(projectJsonDiskPath(entry.path))) {
      valid.push(entry);
    } else {
      removeRecentProject(entry.path);
    }
  }
  return valid;
}

async function doRestoreLastTauriProject(): Promise<boolean> {
  const draft = await getPendingDraftInfo();

  if (!draft) {
    setActiveProjectId(useProjectStore.getState().id);
    await bindTemporaryProjectRoot();
    return false;
  }

  const recents = await listValidRecentProjects();
  const choice = await requestStartupProjectsChoice({ draft, recents });

  if (draft && choice.type !== "restore-draft") {
    await discardPendingDraft(draft.path);
  }

  switch (choice.type) {
    case "restore-draft":
      if (!draft) {
        await bindTemporaryProjectRoot();
        return false;
      }
      await loadProjectFromFolder(draft.path, { temporary: true });
      return true;
    case "open-recent":
      try {
        await loadProjectFromFolder(choice.path);
        return true;
      } catch (err) {
        showError(err);
        removeRecentProject(choice.path);
        setActiveProjectId(useProjectStore.getState().id);
        await bindTemporaryProjectRoot();
        return false;
      }
    case "browse": {
      const opened = await pickAndOpenProject();
      if (!opened) {
        setActiveProjectId(useProjectStore.getState().id);
        await bindTemporaryProjectRoot();
      }
      return opened;
    }
    case "new-show":
      setActiveProjectId(useProjectStore.getState().id);
      await bindTemporaryProjectRoot();
      return false;
  }
}

export async function restoreLastTauriProject(): Promise<boolean> {
  if (!restorePromise) {
    restorePromise = doRestoreLastTauriProject();
  }
  return restorePromise;
}

let restorePromise: Promise<boolean> | undefined;

export async function persistTauriProject(options?: {
  promptForLocation?: boolean;
}): Promise<void> {
  try {
    const rootDir = await resolveProjectRootDir(options);
    if (!rootDir) return;
    await saveProjectToFolder(rootDir);
    syncDraftRootKey();
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      showError(err);
    } else {
      notifyWarningDeduped(t("notification.autosaveFailed"));
    }
  }
}

export async function exportProjectBundleTauri(): Promise<boolean> {
  const snapshot = useProjectStore.getState().getSnapshot();
  if (snapshot.version !== 2) return false;

  const paths = collectSessionAssetPaths(snapshot, useVfsStore.getState().entries);

  const { zip, missing } = await buildProjectBundleZip(snapshot, paths, vfsGet);
  if (missing.length > 0) {
    notifyWarning(t("notification.exportMissingAssets", { count: missing.length }));
  }

  const base = snapshot.name.replace(/[^\w.-]+/g, "_") || "show";
  const path = await save({
    title: t("notification.dialogExportProject"),
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
