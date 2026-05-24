import { basename, join } from "@tauri-apps/api/path";
import { readDir, readFile } from "@tauri-apps/plugin-fs";
import { t } from "../i18n/t";
import { notifyWarning } from "../lib/notifications";
import { isProjectBundlePath } from "../lib/project-paths";
import { useVfsStore } from "../stores/vfs";
import { assetKindFromFilename, type ImportedAsset, mimeTypeFromPath } from "../vfs/import";

async function collectMediaFilePaths(paths: string[]): Promise<string[]> {
  const out: string[] = [];

  for (const p of paths) {
    if (isProjectBundlePath(p)) continue;

    const name = await basename(p);
    if (assetKindFromFilename(name)) {
      out.push(p);
      continue;
    }

    try {
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

  if (readFailures > 0) {
    notifyWarning(
      readFailures === 1
        ? t("notification.droppedFileReadFailed")
        : t("notification.droppedFilesReadFailed", { count: readFailures }),
    );
  }

  return files;
}

export async function importAssetsFromDiskPaths(paths: string[]): Promise<ImportedAsset[]> {
  const files = await filesFromDiskPaths(paths);
  if (!files.length) return [];
  return useVfsStore.getState().importFromFileList(files);
}
