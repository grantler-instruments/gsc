import { vfsGet } from "../vfs/engine";
import { getPlatform } from "./index";

const loading = new Map<string, Promise<Blob | undefined>>();

/** In-memory blob, or load from the open project folder on Tauri. */
export async function resolveAssetBlob(assetPath: string): Promise<Blob | undefined> {
  const existing = vfsGet(assetPath);
  if (existing) return existing;

  if (getPlatform() !== "tauri") return undefined;

  let pending = loading.get(assetPath);
  if (!pending) {
    pending = (async () => {
      const { loadAssetBlobFromProjectDisk } = await import("./vfs-asset.tauri");
      return loadAssetBlobFromProjectDisk(assetPath);
    })().finally(() => {
      loading.delete(assetPath);
    });
    loading.set(assetPath, pending);
  }
  return pending;
}
