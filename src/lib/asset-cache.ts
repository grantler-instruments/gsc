import { normalizePath } from "../vfs/engine";
import { notifyWarningDeduped } from "./notifications";

const CACHE_NAME = "gsc-assets-v1";

function scopedCacheKey(projectId: string, path: string): string {
  return `${projectId}:${normalizePath(path)}`;
}

/** Store asset bytes in the origin-wide Cache API, scoped to a project. */
export async function cacheAsset(projectId: string, path: string, blob: Blob): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(scopedCacheKey(projectId, path), new Response(blob));
  } catch (err) {
    console.warn(`[asset-cache] Could not cache ${path}`, err);
  }
}

/** Read asset bytes for a project from the Cache API. */
export async function getCachedAsset(projectId: string, path: string): Promise<Blob | undefined> {
  if (typeof caches === "undefined") return undefined;
  try {
    const cache = await caches.open(CACHE_NAME);
    const scoped = await cache.match(scopedCacheKey(projectId, path));
    if (!scoped) return undefined;
    return await scoped.blob();
  } catch (err) {
    console.warn(`[asset-cache] Could not read ${path}`, err);
    notifyWarningDeduped(`Could not load asset: ${path}`);
    return undefined;
  }
}

export async function removeCachedAsset(projectId: string, path: string): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(scopedCacheKey(projectId, path));
  } catch {
    /* ignore */
  }
}
