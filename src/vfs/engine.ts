/**
 * In-memory virtual filesystem: virtual path → Blob.
 * Blobs are not stored in Zustand — only metadata lives in the vfs store.
 */

import { tryGetActiveProjectId } from "../lib/active-project-id";
import { cacheAsset, getCachedAsset, removeCachedAsset } from "../lib/asset-cache";
import { getPlatform } from "../platform";
import { isRemoteClient } from "../platform/remote-mode";

let blobEvictionPauses = 0;
/** Keep file bytes resident while saving or changing the project folder. */
export function pauseBlobEviction(): () => void {
  blobEvictionPauses++;
  return () => {
    blobEvictionPauses--;
  };
}

const blobs = new Map<string, Blob>();
const objectUrls = new Map<string, string>();
/** Paths known on disk (Tauri) — resolved into memory on first read. */
const diskBackedPaths = new Set<string>();
/** Paths whose current bytes were persisted or loaded from backing storage. */
const persistedPaths = new Set<string>();
/** Paths whose blob was dropped from RAM under memory pressure; still part of the project. */
const evictedPaths = new Set<string>();
const pendingCacheWrites = new Set<Promise<void>>();

function trackCacheWrite(write: Promise<void>): void {
  pendingCacheWrites.add(write);
  void write.finally(() => {
    pendingCacheWrites.delete(write);
  });
}

/** Wait for in-flight Cache API writes before persisting session metadata. */
export async function flushPendingAssetCacheWrites(): Promise<void> {
  await Promise.all([...pendingCacheWrites]);
}

export function vfsPut(
  path: string,
  blob: Blob,
  options?: { cache?: boolean; persisted?: boolean },
): void {
  const normalized = normalizePath(path);
  revokeUrl(normalized);
  blobs.set(normalized, blob);
  diskBackedPaths.delete(normalized);
  evictedPaths.delete(normalized);
  if (options?.persisted) persistedPaths.add(normalized);
  else persistedPaths.delete(normalized);
  if (options?.cache === false) return;
  if (getPlatform() === "tauri") return;
  const projectId = tryGetActiveProjectId();
  if (projectId) {
    trackCacheWrite(
      cacheAsset(projectId, normalized, blob).then((stored) => {
        if (stored && blobs.get(normalized) === blob) persistedPaths.add(normalized);
      }),
    );
  }
}

export function vfsRegisterDiskPath(path: string): void {
  diskBackedPaths.add(normalizePath(path));
}

export function vfsRegisterDiskPaths(paths: string[]): void {
  for (const path of paths) {
    vfsRegisterDiskPath(path);
  }
}

export function vfsGet(path: string): Blob | undefined {
  return blobs.get(normalizePath(path));
}

export function vfsGetObjectUrl(path: string): string | undefined {
  const normalized = normalizePath(path);
  const existing = objectUrls.get(normalized);
  if (existing) return existing;

  const blob = blobs.get(normalized);
  if (!blob) return undefined;

  const url = URL.createObjectURL(blob);
  objectUrls.set(normalized, url);
  return url;
}

export function vfsHas(path: string): boolean {
  const normalized = normalizePath(path);
  return blobs.has(normalized) || diskBackedPaths.has(normalized) || evictedPaths.has(normalized);
}

/** True while the blob bytes are held in RAM. */
export function vfsIsResident(path: string): boolean {
  return blobs.has(normalizePath(path));
}

/** Resident blob paths with their byte sizes (for memory accounting). */
export function vfsResidentEntries(): { path: string; bytes: number }[] {
  return [...blobs].map(([path, blob]) => ({ path, bytes: blob.size }));
}

async function canReloadBlob(path: string): Promise<boolean> {
  if (isRemoteClient()) return false;
  if (getPlatform() === "tauri") {
    const { assetExistsOnProjectDisk } = await import("../platform/vfs-asset.tauri");
    return persistedPaths.has(path) && (await assetExistsOnProjectDisk(path));
  }
  return persistedPaths.has(path);
}

/**
 * Drop a blob from RAM when it can be read back later (disk on Tauri, IndexedDB on web).
 * Refuses while an object URL is handed out, since a media element may still use it.
 * Returns freed bytes (0 when refused).
 */
export async function vfsEvictBlob(
  path: string,
  mayEvict: () => boolean = () => true,
): Promise<number> {
  const normalized = normalizePath(path);
  const blob = blobs.get(normalized);
  if (blobEvictionPauses > 0 || !blob || objectUrls.has(normalized)) return 0;
  if (!(await canReloadBlob(normalized))) return 0;
  // Re-check after the async probe: the blob may have been replaced or handed out.
  if (blobs.get(normalized) !== blob || objectUrls.has(normalized)) return 0;
  if (blobEvictionPauses > 0 || !mayEvict()) return 0;
  blobs.delete(normalized);
  evictedPaths.add(normalized);
  if (getPlatform() === "tauri") diskBackedPaths.add(normalized);
  return blob.size;
}

export function vfsRemove(path: string): void {
  const normalized = normalizePath(path);
  revokeUrl(normalized);
  blobs.delete(normalized);
  persistedPaths.delete(normalized);
  evictedPaths.delete(normalized);
  diskBackedPaths.delete(normalized);
  if (getPlatform() === "tauri") return;
  const projectId = tryGetActiveProjectId();
  if (projectId) {
    void removeCachedAsset(projectId, normalized);
  }
}

/** Load blobs from the persisted Cache API into the in-memory VFS. */
export async function hydrateVfsFromProjectCache(
  projectId: string,
  paths: string[],
  options?: {
    onPathStart?: (path: string) => void;
    onPathComplete?: (path: string, loaded: boolean) => void;
  },
): Promise<void> {
  await Promise.all(
    paths.map(async (path) => {
      const normalized = normalizePath(path);
      if (blobs.has(normalized)) {
        options?.onPathComplete?.(path, true);
        return;
      }
      options?.onPathStart?.(path);
      const blob = await getCachedAsset(projectId, normalized);
      if (blob) {
        blobs.set(normalized, blob);
        persistedPaths.add(normalized);
        evictedPaths.delete(normalized);
      }
      options?.onPathComplete?.(path, Boolean(blob));
    }),
  );
}

export function vfsClear(): void {
  for (const path of [...blobs.keys()]) {
    revokeUrl(path);
  }
  blobs.clear();
  diskBackedPaths.clear();
  persistedPaths.clear();
  evictedPaths.clear();
}

export function vfsAllPaths(): string[] {
  return [...new Set([...blobs.keys(), ...evictedPaths])].sort();
}

export function normalizePath(path: string): string {
  const trimmed = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/$/, "") || "/";
}

export function joinPath(base: string, relative: string): string {
  const baseNorm = normalizePath(base === "/" ? "" : base);
  const parts = relative.replace(/\\/g, "/").split("/").filter(Boolean);
  const segments = baseNorm === "/" ? [] : baseNorm.slice(1).split("/");
  for (const part of parts) {
    if (part === "..") segments.pop();
    else if (part !== ".") segments.push(part);
  }
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

function revokeUrl(path: string): void {
  const url = objectUrls.get(path);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(path);
  }
}
