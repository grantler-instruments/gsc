import { normalizePath } from "../vfs/engine";
import { notifyWarningDeduped } from "./notifications";

const CACHE_NAME = "gsc-assets-v1";

function scopedCacheKey(projectId: string, path: string): string {
  return `${projectId}:${normalizePath(path)}`;
}

function legacyCacheKey(path: string): string {
  return normalizePath(path);
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

/** Read asset bytes for a project; falls back to pre-project-scoped cache keys. */
export async function getCachedAsset(projectId: string, path: string): Promise<Blob | undefined> {
  if (typeof caches === "undefined") return undefined;
  try {
    const cache = await caches.open(CACHE_NAME);
    const scoped = await cache.match(scopedCacheKey(projectId, path));
    if (scoped) return await scoped.blob();

    const legacy = await cache.match(legacyCacheKey(path));
    if (!legacy) return undefined;
    const blob = await legacy.blob();
    await cacheAsset(projectId, path, blob);
    return blob;
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
    await cache.delete(legacyCacheKey(path));
  } catch {
    /* ignore */
  }
}
