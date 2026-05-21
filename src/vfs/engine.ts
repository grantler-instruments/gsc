/**
 * In-memory virtual filesystem: virtual path → Blob.
 * Blobs are not stored in Zustand — only metadata lives in the vfs store.
 */

import { tryGetActiveProjectId } from "../lib/active-project-id";
import { cacheAsset, getCachedAsset, removeCachedAsset } from "../lib/asset-cache";

const blobs = new Map<string, Blob>();
const objectUrls = new Map<string, string>();
/** Paths known on disk (Tauri) — resolved into memory on first read. */
const diskBackedPaths = new Set<string>();

export function vfsPut(
  path: string,
  blob: Blob,
  options?: { cache?: boolean },
): void {
  const normalized = normalizePath(path);
  revokeUrl(normalized);
  blobs.set(normalized, blob);
  diskBackedPaths.delete(normalized);
  if (options?.cache === false) return;
  const projectId = tryGetActiveProjectId();
  if (projectId) {
    void cacheAsset(projectId, normalized, blob);
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
  return blobs.has(normalized) || diskBackedPaths.has(normalized);
}

export function vfsRemove(path: string): void {
  const normalized = normalizePath(path);
  revokeUrl(normalized);
  blobs.delete(normalized);
  const projectId = tryGetActiveProjectId();
  if (projectId) {
    void removeCachedAsset(projectId, normalized);
  }
}

/** Load blobs from the persisted Cache API into the in-memory VFS. */
export async function hydrateVfsFromProjectCache(
  projectId: string,
  paths: string[],
): Promise<void> {
  await Promise.all(
    paths.map(async (path) => {
      const normalized = normalizePath(path);
      if (blobs.has(normalized)) return;
      const blob = await getCachedAsset(projectId, normalized);
      if (blob) blobs.set(normalized, blob);
    }),
  );
}

export function vfsClear(): void {
  for (const path of [...blobs.keys()]) {
    revokeUrl(path);
  }
  blobs.clear();
  diskBackedPaths.clear();
}

export function vfsAllPaths(): string[] {
  return [...blobs.keys()].sort();
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
