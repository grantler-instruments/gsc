import { t } from "../i18n/t";
import { normalizePath } from "../vfs/engine";
import { notifyWarningDeduped } from "./notifications";

const CACHE_NAME = "gsc-assets-v1";
/** Synthetic origin — Cache API requires valid URL keys, not arbitrary strings. */
const CACHE_ORIGIN = "https://gsc-cache.local";

function scopedCacheKey(projectId: string, path: string): string {
  const normalized = normalizePath(path);
  return `${CACHE_ORIGIN}/projects/${encodeURIComponent(projectId)}${normalized}`;
}

function legacyCacheKey(path: string): string {
  return `${CACHE_ORIGIN}${normalizePath(path)}`;
}

function cacheRequestKey(request: string | Request): string {
  return typeof request === "string" ? request : request.url;
}

function pathFromCacheKey(key: string): string | undefined {
  const legacyPrefix = `${CACHE_ORIGIN}/assets/`;
  if (key.startsWith(legacyPrefix)) {
    return normalizePath(key.slice(CACHE_ORIGIN.length));
  }

  const projectsMarker = `${CACHE_ORIGIN}/projects/`;
  if (key.startsWith(projectsMarker)) {
    const rest = key.slice(projectsMarker.length);
    const slashIdx = rest.indexOf("/");
    if (slashIdx < 0) return undefined;
    return normalizePath(rest.slice(slashIdx));
  }

  // Pre-URL-fix keys: "/assets/foo.wav" or "uuid:/assets/foo.wav"
  if (key.startsWith("/assets/")) return normalizePath(key);
  const legacyScopedIdx = key.indexOf(":/assets/");
  if (legacyScopedIdx > 0) return normalizePath(key.slice(legacyScopedIdx + 1));

  return undefined;
}

async function putCachedBlob(cache: Cache, key: string, blob: Blob): Promise<boolean> {
  try {
    await cache.put(key, new Response(blob));
    return true;
  } catch (err) {
    console.warn(`[asset-cache] Could not cache ${key}`, err);
    return false;
  }
}

async function matchCachedBlob(cache: Cache, key: string): Promise<Blob | undefined> {
  try {
    const response = await cache.match(key);
    if (!response) return undefined;
    return response.blob();
  } catch {
    return undefined;
  }
}

/** Store asset bytes in the origin-wide Cache API, scoped to a project. */
export async function cacheAsset(projectId: string, path: string, blob: Blob): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const normalized = normalizePath(path);
    await putCachedBlob(cache, scopedCacheKey(projectId, normalized), blob);
    await putCachedBlob(cache, legacyCacheKey(normalized), blob);
  } catch (err) {
    console.warn(`[asset-cache] Could not open cache for ${path}`, err);
  }
}

async function findCachedAssetBlob(
  cache: Cache,
  projectId: string,
  path: string,
): Promise<Blob | undefined> {
  const normalized = normalizePath(path);

  const scopedBlob = await matchCachedBlob(cache, scopedCacheKey(projectId, normalized));
  if (scopedBlob) return scopedBlob;

  const legacyBlob = await matchCachedBlob(cache, legacyCacheKey(normalized));
  if (legacyBlob) {
    await cacheAsset(projectId, normalized, legacyBlob);
    return legacyBlob;
  }

  const suffix = normalized;
  for (const request of await cache.keys()) {
    const key = cacheRequestKey(request);
    const cachedPath = pathFromCacheKey(key);
    if (cachedPath !== suffix) continue;

    const blob = await matchCachedBlob(cache, key);
    if (!blob) continue;
    await cacheAsset(projectId, normalized, blob);
    return blob;
  }

  return undefined;
}

/** Read asset bytes for a project; falls back to path-only and legacy scoped keys. */
export async function getCachedAsset(projectId: string, path: string): Promise<Blob | undefined> {
  if (typeof caches === "undefined") return undefined;
  try {
    const cache = await caches.open(CACHE_NAME);
    return await findCachedAssetBlob(cache, projectId, path);
  } catch (err) {
    console.warn(`[asset-cache] Could not read ${path}`, err);
    notifyWarningDeduped(t("notification.assetLoadFailed", { path }));
    return undefined;
  }
}

export async function removeCachedAsset(projectId: string, path: string): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const normalized = normalizePath(path);
    await cache.delete(scopedCacheKey(projectId, normalized));
    await cache.delete(legacyCacheKey(normalized));
  } catch {
    /* ignore */
  }
}
