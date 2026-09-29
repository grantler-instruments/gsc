import { basename, join } from "@tauri-apps/api/path";
import { readDir, readFile, stat } from "@tauri-apps/plugin-fs";
import { t } from "../i18n/t";
import { notifyWarning } from "../lib/notifications";
import { isProjectBundlePath, VFS_ASSETS_ROOT } from "../lib/project-paths";
import { useProjectLocationStore } from "../stores/project-location";
import { useVfsStore } from "../stores/vfs";
import { joinPath, normalizePath, vfsHas, vfsRegisterDiskPath } from "../vfs/engine";
import { assetKindFromFilename, type ImportedAsset, mimeTypeFromPath } from "../vfs/import";

async function collectMediaFilePaths(paths: string[]): Promise<string[]> {
  const out: string[] = [];

  for (const p of paths) {
    if (isProjectBundlePath(p)) continue;

    try {
      const name = await basename(p);
      if (assetKindFromFilename(name)) {
        out.push(p);
        continue;
      }

      const entries = await readDir(p);
      for (const entry of entries) {
        const child = await join(p, entry.name);
        if (entry.isDirectory) {
          out.push(...(await collectMediaFilePaths([child])));
        } else if (assetKindFromFilename(entry.name)) {
          out.push(child);
        }
      }
    } catch {
      // Not a directory or unreadable — skip.
    }
  }

  return out;
}

export async function filesFromDiskPaths(paths: string[]): Promise<File[]> {
  const mediaPaths = await collectMediaFilePaths(paths);
  const files: File[] = [];
  let readFailures = 0;

  for (const diskPath of mediaPaths) {
    const name = await basename(diskPath);
    try {
      const data = await readFile(diskPath);
      const mime = mimeTypeFromPath(name);
      files.push(
        new File([data], name, {
          type: mime || "application/octet-stream",
        }),
      );
    } catch (err) {
      console.warn(`[tauri] Could not read dropped file ${diskPath}`, err);
      readFailures += 1;
    }
  }

  notifyReadFailures(readFailures);

  return files;
}

function notifyReadFailures(count: number): void {
  if (count === 0) return;
  notifyWarning(
    count === 1
      ? t("notification.droppedFileReadFailed")
      : t("notification.droppedFilesReadFailed", { count }),
  );
}

/** Copy dropped files into the project folder on disk; bytes load lazily when first used. */
async function copyDiskPathsIntoProject(paths: string[]): Promise<ImportedAsset[]> {
  const { copyDiskFileIntoProject } = await import("./project-storage.tauri");
  const imported: ImportedAsset[] = [];
  let failures = 0;

  for (const diskPath of await collectMediaFilePaths(paths)) {
    const name = await basename(diskPath);
    const kind = assetKindFromFilename(name);
    if (!kind) continue;
    const path = normalizePath(joinPath(VFS_ASSETS_ROOT, name));
    try {
      // Same as importFiles: an asset already in the project keeps its current bytes.
      if (!vfsHas(path)) {
        await copyDiskFileIntoProject(diskPath, path);
        vfsRegisterDiskPath(path);
      }
      const { size } = await stat(diskPath);
      imported.push({ path, name, size, mimeType: mimeTypeFromPath(name), kind });
    } catch (err) {
      console.warn(`[tauri] Could not copy dropped file ${diskPath}`, err);
      failures += 1;
    }
  }

  notifyReadFailures(failures);
  useVfsStore.getState().addDiskAssets(imported);
  return imported;
}

export async function importAssetsFromDiskPaths(paths: string[]): Promise<ImportedAsset[]> {
  if (useProjectLocationStore.getState().rootDir) return copyDiskPathsIntoProject(paths);
  const files = await filesFromDiskPaths(paths);
  if (!files.length) return [];
  return useVfsStore.getState().importFromFileList(files);
}
