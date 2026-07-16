import { normalizePath } from "../vfs/engine";

const blobs = new Map<string, Blob>();
const objectUrls = new Map<string, string>();
const listeners = new Set<() => void>();

function assetKey(projectId: string, assetPath: string): string {
  return `${projectId}:${normalizePath(assetPath)}`;
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Subscribe to asset blob arrivals in the output window. */
export function subscribeOutputAssets(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Store asset bytes pushed from the control window (same-tab or cross-webview). */
export function storeOutputAssetBlob(projectId: string, assetPath: string, blob: Blob): void {
  const key = assetKey(projectId, assetPath);
  if (objectUrls.has(key)) {
    blobs.set(key, blob);
    return;
  }

  blobs.set(key, blob);
  objectUrls.set(key, URL.createObjectURL(blob));
  notifyListeners();
}

/** Read asset bytes previously pushed to the output window. */
export function getOutputAssetBlob(projectId: string, assetPath: string): Blob | undefined {
  return blobs.get(assetKey(projectId, assetPath));
}

/** Object URL for a pushed asset, created when the blob is stored. */
export function getOutputAssetObjectUrl(projectId: string, assetPath: string): string | undefined {
  return objectUrls.get(assetKey(projectId, assetPath));
}

export function clearOutputAssetBlob(projectId: string, assetPath: string): void {
  const key = assetKey(projectId, assetPath);
  const url = objectUrls.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(key);
  }
  blobs.delete(key);
}

export function clearOutputAssetBlobsForProject(projectId: string, assetPaths: string[]): void {
  for (const assetPath of assetPaths) {
    clearOutputAssetBlob(projectId, assetPath);
  }
}

export function clearOutputAssetBlobs(): void {
  for (const url of objectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  blobs.clear();
  objectUrls.clear();
}

/** Test-only reset. */
export function resetOutputAssetBridgeForTests(): void {
  clearOutputAssetBlobs();
  listeners.clear();
}
