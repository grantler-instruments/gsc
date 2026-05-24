import { getCachedAsset } from "../lib/asset-cache";
import { tryGetActiveProjectId } from "../lib/active-project-id";
import { useVfsStore } from "../stores/vfs";
import { normalizePath, vfsPut } from "../vfs/engine";

/** Load a cache-backed asset into the in-memory VFS (no Cache API write). */
export async function loadAssetBlobFromProjectCache(
  virtualPath: string,
): Promise<Blob | undefined> {
  const projectId = tryGetActiveProjectId();
  if (!projectId) return undefined;

  const normalized = normalizePath(virtualPath);
  const blob = await getCachedAsset(projectId, normalized);
  if (!blob) return undefined;

  vfsPut(normalized, blob, { cache: false });
  useVfsStore.getState().refreshEntriesLoaded();
  return blob;
}
