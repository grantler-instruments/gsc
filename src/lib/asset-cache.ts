import { normalizePath } from "../vfs/engine";

const CACHE_NAME = "gsc-assets-v1";

function cacheKey(path: string): string {
  return normalizePath(path);
}

/** Store asset bytes in the origin-wide Cache API (shared across windows). */
export async function cacheAsset(path: string, blob: Blob): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(cacheKey(path), new Response(blob));
  } catch (err) {
    console.warn(`[asset-cache] Could not cache ${path}`, err);
  }
}

/** Read asset bytes written by the control window. */
export async function getCachedAsset(path: string): Promise<Blob | undefined> {
  if (typeof caches === "undefined") return undefined;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(cacheKey(path));
    if (!response) return undefined;
    return await response.blob();
  } catch (err) {
    console.warn(`[asset-cache] Could not read ${path}`, err);
    return undefined;
  }
}

export async function removeCachedAsset(path: string): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(cacheKey(path));
  } catch {
    /* ignore */
  }
}
