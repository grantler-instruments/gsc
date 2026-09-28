import { exists, readFile } from "@tauri-apps/plugin-fs";
import { t } from "../i18n/t";
import { notifyWarningDeduped } from "../lib/notifications";
import { diskPathForAsset } from "../lib/project-disk";
import { useProjectLocationStore } from "../stores/project-location";
import { normalizePath, vfsPut } from "../vfs/engine";
import { mimeTypeFromPath } from "../vfs/import";

export async function readAssetBlobFromProjectDisk(virtualPath: string): Promise<Blob | undefined> {
  const rootDir = useProjectLocationStore.getState().rootDir;
  if (!rootDir) return undefined;

  const normalized = normalizePath(virtualPath);
  const diskPath = diskPathForAsset(rootDir, normalized);

  try {
    if (!(await exists(diskPath))) return undefined;
    const data = await readFile(diskPath);
    const mime = mimeTypeFromPath(normalized);
    return mime ? new Blob([data], { type: mime }) : new Blob([data]);
  } catch (err) {
    console.warn(`[tauri] Could not read asset ${normalized}`, err);
    notifyWarningDeduped(t("notification.assetReadFailed", { path: normalized }));
    return undefined;
  }
}

/** True when the asset file exists in the open project's folder. */
export async function assetExistsOnProjectDisk(virtualPath: string): Promise<boolean> {
  const rootDir = useProjectLocationStore.getState().rootDir;
  if (!rootDir) return false;
  try {
    return await exists(diskPathForAsset(rootDir, normalizePath(virtualPath)));
  } catch {
    return false;
  }
}

/** Load a disk-backed asset into the in-memory VFS (no Cache API write). */
export async function loadAssetBlobFromProjectDisk(virtualPath: string): Promise<Blob | undefined> {
  const blob = await readAssetBlobFromProjectDisk(virtualPath);
  if (!blob) return undefined;
  vfsPut(virtualPath, blob, { cache: false, persisted: true });
  return blob;
}
