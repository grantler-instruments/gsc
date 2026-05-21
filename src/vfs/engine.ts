/**
 * In-memory virtual filesystem: virtual path → Blob.
 * Blobs are not stored in Zustand — only metadata lives in the vfs store.
 */

import { cacheAsset, removeCachedAsset } from "../lib/asset-cache";

const blobs = new Map<string, Blob>();
const objectUrls = new Map<string, string>();

export function vfsPut(path: string, blob: Blob): void {
  const normalized = normalizePath(path);
  revokeUrl(normalized);
  blobs.set(normalized, blob);
  void cacheAsset(normalized, blob);
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
  return blobs.has(normalizePath(path));
}

export function vfsRemove(path: string): void {
  const normalized = normalizePath(path);
  revokeUrl(normalized);
  blobs.delete(normalized);
  void removeCachedAsset(normalized);
}

export function vfsClear(): void {
  for (const path of [...blobs.keys()]) {
    revokeUrl(path);
  }
  blobs.clear();
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
