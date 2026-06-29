import { normalizePath } from "../vfs/engine";

const blobs = new Map<string, Blob>();

function assetKey(projectId: string, assetPath: string): string {
  return `${projectId}:${normalizePath(assetPath)}`;
}

/** Store asset bytes pushed from the control window (same-tab or cross-webview). */
export function storeOutputAssetBlob(projectId: string, assetPath: string, blob: Blob): void {
  blobs.set(assetKey(projectId, assetPath), blob);
}

/** Read asset bytes previously pushed to the output window. */
export function getOutputAssetBlob(projectId: string, assetPath: string): Blob | undefined {
  return blobs.get(assetKey(projectId, assetPath));
}

export function clearOutputAssetBlob(projectId: string, assetPath: string): void {
  blobs.delete(assetKey(projectId, assetPath));
}

export function clearOutputAssetBlobsForProject(projectId: string, assetPaths: string[]): void {
  for (const assetPath of assetPaths) {
    blobs.delete(assetKey(projectId, assetPath));
  }
}

export function clearOutputAssetBlobs(): void {
  blobs.clear();
}
