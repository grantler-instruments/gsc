import { setActiveProjectId, tryGetActiveProjectId } from "../lib/active-project-id";
import { cacheAsset, getCachedAsset } from "../lib/asset-cache";
import { buildVfsEntries } from "../lib/hydrate-project-assets";
import { prefetchMediaDurations } from "../lib/media-duration";
import {
  buildProjectBundleZip,
  hydrateVfsFromBundleAssets,
  parseProjectBundleZip,
} from "../lib/project-bundle";
import { replaceProjectWithoutHistory } from "../lib/project-history";
import { idbTouchProjectOpened } from "../lib/project-idb";
import { BUNDLE_EXTENSION } from "../lib/project-paths";
import {
  collectSessionAssetPaths,
  deleteStoredProject,
  openStoredProject,
  persistProjectSessionAsync,
} from "../lib/project-session";
import { snapshotToCueLists } from "../lib/project-snapshot";
import { useProjectStore } from "../stores/project";
import { useProjectLoadingStore } from "../stores/project-loading";
import { useVfsStore } from "../stores/vfs";
import { vfsClear, vfsGet } from "../vfs/engine";
import { assetKindFromPath } from "../vfs/import";

async function readBlobForBundle(path: string): Promise<Blob | undefined> {
  const fromVfs = vfsGet(path);
  if (fromVfs) return fromVfs;
  const projectId = tryGetActiveProjectId();
  if (!projectId) return undefined;
  return getCachedAsset(projectId, path);
}

export async function exportProjectBundleWeb(): Promise<{ missing: string[] }> {
  const snapshot = useProjectStore.getState().getSnapshot();
  if (snapshot.version !== 2) return { missing: [] };

  const paths = collectSessionAssetPaths(snapshot, useVfsStore.getState().entries);

  const { zip, missing } = await buildProjectBundleZip(snapshot, paths, readBlobForBundle);

  const blob = new Blob([zip], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const base = snapshot.name.replace(/[^\w.-]+/g, "_") || "show";
  a.href = url;
  a.download = `${base}${BUNDLE_EXTENSION}`;
  a.click();
  URL.revokeObjectURL(url);

  return { missing };
}

export async function openStoredWebProject(projectId: string): Promise<boolean> {
  return openStoredProject(projectId);
}

export async function deleteStoredWebProject(projectId: string): Promise<boolean> {
  return deleteStoredProject(projectId);
}

export async function importProjectBundleWeb(file: File): Promise<void> {
  const data = new Uint8Array(await file.arrayBuffer());
  const { snapshot, assets } = parseProjectBundleZip(data);

  vfsClear();
  const loaded = snapshotToCueLists(snapshot);
  replaceProjectWithoutHistory(() => {
    setActiveProjectId(loaded.id);
    useProjectStore.setState(loaded);
  });

  const assetMetadata = assets.map(({ path, data: bytes }) => {
    const name = path.split("/").pop() ?? path;
    const blob = new Blob([bytes]);
    return {
      path,
      name,
      size: blob.size,
      mimeType: blob.type,
      kind: assetKindFromPath(path),
    };
  });

  const paths = collectSessionAssetPaths(snapshot, assetMetadata);
  const metadataByPath = new Map(assetMetadata.map((entry) => [entry.path, entry]));
  const { initAssetProgress, setAssetStatus } = useProjectLoadingStore.getState();
  initAssetProgress(
    paths.map((path) => ({
      path,
      name: metadataByPath.get(path)?.name,
    })),
  );

  const bundlePaths = new Set(assets.map((asset) => asset.path));
  for (const { path, data: bytes } of assets) {
    setAssetStatus(path, "loading");
    hydrateVfsFromBundleAssets([{ path, data: bytes }]);
    setAssetStatus(path, "loaded");
  }
  for (const path of paths) {
    if (!bundlePaths.has(path)) {
      setAssetStatus(path, "missing");
    }
  }

  await Promise.all(
    assets.map(({ path, data: bytes }) => cacheAsset(loaded.id, path, new Blob([bytes]))),
  );

  prefetchMediaDurations(
    paths.filter((path) => {
      const kind = assetKindFromPath(path);
      return kind === "audio" || kind === "video";
    }),
  );

  useVfsStore.setState({
    entries: buildVfsEntries(paths, assetMetadata),
  });

  await persistProjectSessionAsync();
  await idbTouchProjectOpened(loaded.id);
}
