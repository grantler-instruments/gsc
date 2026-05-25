import { setActiveProjectId, tryGetActiveProjectId } from "../lib/active-project-id";
import { cacheAsset, getCachedAsset } from "../lib/asset-cache";
import {
  buildProjectBundleZip,
  hydrateVfsFromBundleAssets,
  parseProjectBundleZip,
} from "../lib/project-bundle";
import { replaceProjectWithoutHistory } from "../lib/project-history";
import { BUNDLE_EXTENSION } from "../lib/project-paths";
import { collectSessionAssetPaths, persistProjectSessionAsync } from "../lib/project-session";
import { snapshotToCueLists } from "../lib/project-snapshot";
import { useProjectStore } from "../stores/project";
import type { VfsEntry } from "../stores/vfs";
import { useVfsStore } from "../stores/vfs";
import { vfsClear, vfsGet } from "../vfs/engine";
import { assetKindFromPath } from "../vfs/import";

function vfsEntriesFromPaths(paths: string[]): VfsEntry[] {
  return paths
    .map((path) => {
      const name = path.split("/").pop() ?? path;
      const blob = vfsGet(path);
      return {
        path,
        name,
        size: blob?.size ?? 0,
        mimeType: blob?.type ?? "",
        kind: assetKindFromPath(path),
        loaded: Boolean(blob),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

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

export async function importProjectBundleWeb(file: File): Promise<void> {
  const data = new Uint8Array(await file.arrayBuffer());
  const { snapshot, assets } = parseProjectBundleZip(data);

  vfsClear();
  const loaded = snapshotToCueLists(snapshot);
  replaceProjectWithoutHistory(() => {
    setActiveProjectId(loaded.id);
    useProjectStore.setState(loaded);
  });

  hydrateVfsFromBundleAssets(assets);

  for (const { path, data: bytes } of assets) {
    await cacheAsset(loaded.id, path, new Blob([bytes]));
  }

  useVfsStore.setState({
    entries: vfsEntriesFromPaths(assets.map((a) => a.path)),
  });

  await persistProjectSessionAsync();
}
