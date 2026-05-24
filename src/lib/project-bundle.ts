import { strFromU8, strToU8, unzipSync, type Zippable, zipSync } from "fflate";
import type { ProjectSnapshot } from "../types/cue";
import { vfsPut } from "../vfs/engine";
import { isAssetsRelativePath, ASSETS_DIR, PROJECT_JSON, virtualPathFromRelativeAssetFile, virtualToRelative } from "./project-paths";

/** Relative paths and bytes for every file in a bundle (including project.json). */
export interface ProjectBundleDiskFile {
  relativePath: string;
  data: Uint8Array;
}

export interface ProjectBundleAsset {
  path: string;
  data: Uint8Array;
}

export async function buildProjectBundleZip(
  snapshot: ProjectSnapshot,
  assetPaths: string[],
  readBlob: (path: string) => Blob | undefined | Promise<Blob | undefined>,
): Promise<{ zip: Uint8Array; missing: string[] }> {
  const missing: string[] = [];
  const zipEntries: Zippable = {
    [PROJECT_JSON]: strToU8(JSON.stringify(snapshot, null, 2)),
  };

  for (const virtualPath of assetPaths) {
    const blob = await readBlob(virtualPath);
    if (!blob) {
      missing.push(virtualPath);
      continue;
    }
    const rel = virtualToRelative(virtualPath);
    const zipPath = rel.startsWith(`${ASSETS_DIR}/`) ? rel : `${ASSETS_DIR}/${rel}`;
    zipEntries[zipPath] = new Uint8Array(await blob.arrayBuffer());
  }

  return { zip: zipSync(zipEntries), missing };
}

export function parseProjectBundleZip(data: Uint8Array): {
  snapshot: ProjectSnapshot;
  assets: ProjectBundleAsset[];
} {
  const unzipped = unzipSync(data);
  let snapshot: ProjectSnapshot | undefined;

  const assets: ProjectBundleAsset[] = [];

  for (const [name, bytes] of Object.entries(unzipped)) {
    if (name === PROJECT_JSON || name.endsWith(`/${PROJECT_JSON}`)) {
      snapshot = JSON.parse(strFromU8(bytes)) as ProjectSnapshot;
      continue;
    }
    if (isAssetsRelativePath(name) && !name.endsWith("/")) {
      const virtual = virtualPathFromRelativeAssetFile(name);
      assets.push({ path: virtual, data: bytes });
    }
  }

  if (!snapshot || snapshot.version !== 2) {
    throw new Error("Invalid project bundle: missing project.json");
  }

  return { snapshot, assets };
}

/** Flatten a bundle zip into on-disk paths (project.json + assets/*). */
export function projectBundleDiskFiles(data: Uint8Array): {
  snapshot: ProjectSnapshot;
  files: ProjectBundleDiskFile[];
} {
  const { snapshot, assets } = parseProjectBundleZip(data);
  const files: ProjectBundleDiskFile[] = [
    {
      relativePath: PROJECT_JSON,
      data: strToU8(JSON.stringify(snapshot, null, 2)),
    },
  ];
  for (const { path, data: bytes } of assets) {
    files.push({ relativePath: virtualToRelative(path), data: bytes });
  }
  return { snapshot, files };
}

export function hydrateVfsFromBundleAssets(assets: ProjectBundleAsset[]): void {
  for (const { path, data } of assets) {
    vfsPut(path, new Blob([data]));
  }
}
