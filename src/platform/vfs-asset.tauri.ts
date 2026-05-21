import { exists, readFile } from "@tauri-apps/plugin-fs";
import { diskPathForAsset } from "../lib/project-disk";
import { useProjectLocationStore } from "../stores/project-location";
import { mimeTypeFromPath } from "../vfs/import";
import { normalizePath, vfsPut } from "../vfs/engine";

export async function readAssetBlobFromProjectDisk(
  virtualPath: string,
): Promise<Blob | undefined> {
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
    return undefined;
  }
}

/** Load a disk-backed asset into the in-memory VFS (no Cache API write). */
export async function loadAssetBlobFromProjectDisk(
  virtualPath: string,
): Promise<Blob | undefined> {
  const blob = await readAssetBlobFromProjectDisk(virtualPath);
  if (!blob) return undefined;
  vfsPut(virtualPath, blob, { cache: false });
  return blob;
}
