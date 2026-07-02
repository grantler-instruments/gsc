import { getPlatform } from "../platform";
import { normalizePath } from "../vfs/engine";
import { mimeTypeFromPath } from "../vfs/import";
import { getCachedAsset } from "./asset-cache";
import { getOutputAssetBlob, getOutputAssetObjectUrl } from "./output-asset-bridge";
import { diskPathForAsset } from "./project-disk";

const diskObjectUrls = new Map<string, string>();
const fallbackObjectUrls = new Map<string, string>();

function diskCacheKey(rootDir: string, assetPath: string): string {
  return `${rootDir}:${normalizePath(assetPath)}`;
}

function fallbackCacheKey(projectId: string, assetPath: string): string {
  return `${projectId}:${normalizePath(assetPath)}`;
}

async function readBlobFromProjectRoot(
  rootDir: string,
  assetPath: string,
): Promise<Blob | undefined> {
  if (getPlatform() !== "tauri") return undefined;

  const normalized = normalizePath(assetPath);
  const diskPath = diskPathForAsset(rootDir, normalized);

  try {
    const { exists, readFile } = await import("@tauri-apps/plugin-fs");
    const onDisk = await exists(diskPath);
    if (!onDisk) {
      return undefined;
    }
    const data = await readFile(diskPath);
    const mime = mimeTypeFromPath(normalized);
    return mime ? new Blob([data], { type: mime }) : new Blob([data]);
  } catch (err) {
    console.warn("[output] Disk read failed", normalized, err);
    return undefined;
  }
}

async function resolveFromBridgeOrCache(
  projectId: string,
  assetPath: string,
): Promise<string | undefined> {
  const normalized = normalizePath(assetPath);

  const pushedUrl = getOutputAssetObjectUrl(projectId, normalized);
  if (pushedUrl) return pushedUrl;

  const fallbackKey = fallbackCacheKey(projectId, normalized);
  const cachedFallback = fallbackObjectUrls.get(fallbackKey);
  if (cachedFallback) return cachedFallback;

  const blob =
    getOutputAssetBlob(projectId, normalized) ?? (await getCachedAsset(projectId, normalized));
  if (!blob) return undefined;

  const urlAfterWait = getOutputAssetObjectUrl(projectId, normalized);
  if (urlAfterWait) return urlAfterWait;

  const url = URL.createObjectURL(blob);
  fallbackObjectUrls.set(fallbackKey, url);
  return url;
}

/** Resolve a stable object URL for an output-window layer asset. */
export async function resolveOutputAssetObjectUrl(
  projectId: string,
  projectRootDir: string | null,
  assetPath: string,
): Promise<string | undefined> {
  const normalized = normalizePath(assetPath);

  if (getPlatform() === "tauri" && projectRootDir) {
    const key = diskCacheKey(projectRootDir, normalized);
    const cached = diskObjectUrls.get(key);
    if (cached) {
      return cached;
    }

    const blob = await readBlobFromProjectRoot(projectRootDir, normalized);
    if (blob) {
      const url = URL.createObjectURL(blob);
      diskObjectUrls.set(key, url);
      return url;
    }
  }

  return resolveFromBridgeOrCache(projectId, normalized);
}

/** Test-only reset. */
export function resetOutputAssetResolverForTests(): void {
  for (const url of diskObjectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  for (const url of fallbackObjectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  diskObjectUrls.clear();
  fallbackObjectUrls.clear();
}
