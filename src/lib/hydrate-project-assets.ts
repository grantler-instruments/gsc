import { useProjectStore } from "../stores/project";
import { useProjectLoadingStore } from "../stores/project-loading";
import { useVfsStore, type VfsEntry } from "../stores/vfs";
import { hydrateVfsFromProjectCache, vfsGet, vfsHas } from "../vfs/engine";
import { assetKindFromPath } from "../vfs/import";
import { prefetchMediaDurations } from "./media-duration";
import type { PersistedAssetEntry } from "./project-idb";
import { collectSessionAssetPaths } from "./project-session";

function mediaPaths(paths: string[]): string[] {
  return paths.filter((path) => {
    const kind = assetKindFromPath(path);
    return kind === "audio" || kind === "video";
  });
}

export function buildVfsEntries(paths: string[], metadata: PersistedAssetEntry[]): VfsEntry[] {
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

async function hydratePathsWithProgress(projectId: string, paths: string[]): Promise<void> {
  const { setAssetStatus } = useProjectLoadingStore.getState();

  await hydrateVfsFromProjectCache(projectId, paths, {
    onPathStart: (path) => {
      if (!vfsHas(path)) setAssetStatus(path, "loading");
    },
    onPathComplete: (path, loaded) => {
      setAssetStatus(path, loaded ? "loaded" : "pending");
    },
  });

  const stillMissing = paths.filter((path) => !vfsHas(path));
  if (stillMissing.length > 0) {
    const { resolveAssetBlob } = await import("../platform/vfs-asset");
    await Promise.all(
      stillMissing.map(async (path) => {
        setAssetStatus(path, "loading");
        const blob = await resolveAssetBlob(path);
        setAssetStatus(path, blob ? "loaded" : "missing");
      }),
    );
  }

  for (const path of paths) {
    if (vfsHas(path)) {
      setAssetStatus(path, "loaded");
    } else {
      setAssetStatus(path, "missing");
    }
  }
}

/** Load every referenced asset from cache into the VFS and refresh the assets panel. */
export async function hydrateAllProjectAssets(
  projectId: string,
  assetMetadata: PersistedAssetEntry[] = [],
): Promise<void> {
  const snapshot = useProjectStore.getState().getSnapshot();
  if (snapshot.version !== 2) return;

  const paths = collectSessionAssetPaths(snapshot, assetMetadata);
  const metadataByPath = new Map(assetMetadata.map((entry) => [entry.path, entry]));
  useProjectLoadingStore.getState().initAssetProgress(
    paths.map((path) => ({
      path,
      name: metadataByPath.get(path)?.name,
    })),
  );

  await hydratePathsWithProgress(projectId, paths);

  prefetchMediaDurations(mediaPaths(paths));

  useVfsStore.setState({
    entries: buildVfsEntries(paths, assetMetadata),
  });
}
