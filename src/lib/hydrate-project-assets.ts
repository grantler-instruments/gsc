import { prefetchMediaDurations } from "./media-duration";
import { collectSessionAssetPaths } from "./project-session";
import type { PersistedAssetEntry } from "./project-idb";
import { useProjectStore } from "../stores/project";
import { useVfsStore, type VfsEntry } from "../stores/vfs";
import { hydrateVfsFromProjectCache, vfsGet, vfsHas } from "../vfs/engine";
import { assetKindFromPath } from "../vfs/import";

function mediaPaths(paths: string[]): string[] {
  return paths.filter((path) => {
    const kind = assetKindFromPath(path);
    return kind === "audio" || kind === "video";
  });
}

export function buildVfsEntries(
  paths: string[],
  metadata: PersistedAssetEntry[],
): VfsEntry[] {
  const metadataByPath = new Map(metadata.map((entry) => [entry.path, entry]));
  return paths
    .map((path) => {
      const meta = metadataByPath.get(path);
      const blob = vfsGet(path);
      const name = meta?.name ?? path.split("/").pop() ?? path;
      return {
        path,
        name,
        size: blob?.size ?? meta?.size ?? 0,
        mimeType: blob?.type ?? meta?.mimeType ?? "",
        kind: meta?.kind ?? assetKindFromPath(path),
        loaded: vfsHas(path),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Load every referenced asset from cache into the VFS and refresh the assets panel. */
export async function hydrateAllProjectAssets(
  projectId: string,
  assetMetadata: PersistedAssetEntry[] = [],
): Promise<void> {
  const snapshot = useProjectStore.getState().getSnapshot();
  if (snapshot.version !== 2) return;

  const paths = collectSessionAssetPaths(snapshot, assetMetadata);
  await hydrateVfsFromProjectCache(projectId, paths);

  const stillMissing = paths.filter((path) => !vfsHas(path));
  if (stillMissing.length > 0) {
    const { resolveAssetBlob } = await import("../platform/vfs-asset");
    await Promise.all(stillMissing.map((path) => resolveAssetBlob(path)));
  }

  prefetchMediaDurations(mediaPaths(paths));

  useVfsStore.setState({
    entries: buildVfsEntries(paths, assetMetadata),
  });
}
