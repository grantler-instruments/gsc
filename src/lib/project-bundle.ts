import { strFromU8, strToU8, Unzip, UnzipInflate, type Zippable, zipSync } from "fflate";
import { t } from "../i18n/t";
import type { ProjectSnapshot } from "../types/cue";
import { vfsPut } from "../vfs/engine";
import {
  ASSETS_DIR,
  isAssetsRelativePath,
  PROJECT_JSON,
  virtualPathFromRelativeAssetFile,
  virtualToRelative,
} from "./project-paths";

/** Relative paths and bytes for every file in a bundle (including project.json). */
export interface ProjectBundleDiskFile {
  relativePath: string;
  data: Uint8Array;
}

export interface ProjectBundleAsset {
  path: string;
  data: Uint8Array;
}

// Media files are already compressed. Storing them prevents DEFLATE failures
// from making an otherwise valid project bundle impossible to import.
const BINARY_ASSET_ZIP_OPTIONS = { level: 0 } as const;

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 1) return chunks[0] ?? new Uint8Array();

  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Extract valid ZIP members independently, so one corrupt asset does not
 * prevent the project metadata and other assets from being recovered.
 */
function unzipRecoverableEntries(data: Uint8Array): Record<string, Uint8Array> {
  const entries: Record<string, Uint8Array> = {};
  const unzip = new Unzip((file) => {
    const chunks: Uint8Array[] = [];
    file.ondata = (error, chunk, final) => {
      if (error || !chunk) {
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
      if (final) entries[file.name] = concatChunks(chunks);
    };
    try {
      file.start();
    } catch {
      // An unsupported or corrupt member is treated as a missing asset.
    }
  });
  unzip.register(UnzipInflate);
  unzip.push(data, true);
  return entries;
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
    zipEntries[zipPath] = [new Uint8Array(await blob.arrayBuffer()), BINARY_ASSET_ZIP_OPTIONS];
  }

  return { zip: zipSync(zipEntries), missing };
}

export function parseProjectBundleZip(data: Uint8Array): {
  snapshot: ProjectSnapshot;
  assets: ProjectBundleAsset[];
} {
  const unzipped = unzipRecoverableEntries(data);
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
    throw new Error(t("notification.invalidBundle"));
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
