import { normalizePath, vfsPut } from "../vfs/engine";
import { buildRemoteAssetUrl, canFetchRemoteAssets } from "./remote-asset-url";

const loading = new Map<string, Promise<Blob | undefined>>();

/** Fetch a project asset from the booth HTTP server into the local VFS. */
export async function fetchRemoteAssetBlob(assetPath: string): Promise<Blob | undefined> {
  if (!canFetchRemoteAssets()) return undefined;

  const normalized = normalizePath(assetPath);
  let pending = loading.get(normalized);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(buildRemoteAssetUrl(normalized));
      if (!response.ok) {
        console.warn(`[remote] asset fetch failed ${normalized}: ${response.status}`);
        return undefined;
      }
      const blob = await response.blob();
      vfsPut(normalized, blob, { cache: false });
      return blob;
    })().finally(() => {
      loading.delete(normalized);
    });
    loading.set(normalized, pending);
  }
  return pending;
}
