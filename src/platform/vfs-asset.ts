import { vfsGet } from "../vfs/engine";
import { getPlatform } from "./index";
import { isRemoteClient } from "./remote-mode";

const loading = new Map<string, Promise<Blob | undefined>>();

/** In-memory blob, or load from disk (Tauri) / Cache API (web). */
export async function resolveAssetBlob(assetPath: string): Promise<Blob | undefined> {
  const existing = vfsGet(assetPath);
  if (existing) return existing;

  let pending = loading.get(assetPath);
  if (!pending) {
    pending = (async () => {
      if (isRemoteClient()) {
        const { fetchRemoteAssetBlob } = await import("./remote-asset");
        return fetchRemoteAssetBlob(assetPath);
      }
      if (getPlatform() === "tauri") {
        const { loadAssetBlobFromProjectDisk } = await import("./vfs-asset.tauri");
        return loadAssetBlobFromProjectDisk(assetPath);
      }
      const { loadAssetBlobFromProjectCache } = await import("./vfs-asset.web");
      return loadAssetBlobFromProjectCache(assetPath);
    })().finally(() => {
      loading.delete(assetPath);
    });
    loading.set(assetPath, pending);
  }
  return pending;
}
