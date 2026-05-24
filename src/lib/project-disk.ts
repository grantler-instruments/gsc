import { useProjectLocationStore } from "../stores/project-location";
import { normalizePath, vfsGet, vfsPut, vfsRegisterDiskPaths } from "../vfs/engine";
import {
  assetRelativePath,
  PROJECT_JSON,
  isAssetsRelativePath,
  virtualPathFromRelativeAssetFile,
} from "./project-paths";

export function getProjectRootDir(): string | null {
  return useProjectLocationStore.getState().rootDir;
}

export function diskPathForAsset(rootDir: string, virtualPath: string): string {
  const rel = assetRelativePath(virtualPath);
  const sep = rootDir.includes("\\") ? "\\" : "/";
  return `${rootDir.replace(/[/\\]+$/, "")}${sep}${rel.replace(/\//g, sep)}`;
}

export async function hydrateVfsFromDisk(
  rootDir: string,
  paths: string[],
  readFile: (diskPath: string) => Promise<Uint8Array | null>,
): Promise<void> {
  await Promise.all(
    paths.map(async (virtualPath) => {
      const normalized = normalizePath(virtualPath);
      const diskPath = diskPathForAsset(rootDir, normalized);
      const data = await readFile(diskPath);
      if (!data) return;
      vfsPut(normalized, new Blob([data]));
    }),
  );
}

/** Register on-disk assets without loading bytes (lazy load on playback). */
export async function registerDiskAssetPaths(
  rootDir: string,
  paths: string[],
  pathExists: (diskPath: string) => Promise<boolean>,
): Promise<void> {
  const available: string[] = [];
  await Promise.all(
    paths.map(async (virtualPath) => {
      const normalized = normalizePath(virtualPath);
      const diskPath = diskPathForAsset(rootDir, normalized);
      if (await pathExists(diskPath)) {
        available.push(normalized);
      }
    }),
  );
  vfsRegisterDiskPaths(available);
}

export async function writeAssetToDisk(
  rootDir: string,
  virtualPath: string,
  blob: Blob,
  writeFile: (diskPath: string, data: Uint8Array) => Promise<void>,
  mkdir: (dir: string) => Promise<void>,
): Promise<void> {
  const diskPath = diskPathForAsset(rootDir, virtualPath);
  const dir = diskPath.replace(/[/\\][^/\\]+$/, "");
  await mkdir(dir);
  await writeFile(diskPath, new Uint8Array(await blob.arrayBuffer()));
}

export async function saveAllVfsAssetsToDisk(
  rootDir: string,
  paths: string[],
  writeFile: (diskPath: string, data: Uint8Array) => Promise<void>,
  mkdir: (dir: string) => Promise<void>,
): Promise<void> {
  for (const virtualPath of paths) {
    const blob = vfsGet(virtualPath);
    if (!blob) continue;
    await writeAssetToDisk(rootDir, virtualPath, blob, writeFile, mkdir);
  }
}

export function projectJsonDiskPath(rootDir: string): string {
  const sep = rootDir.includes("\\") ? "\\" : "/";
  return `${rootDir.replace(/[/\\]+$/, "")}${sep}${PROJECT_JSON}`;
}

/** List asset files under assets/ on disk (returns virtual paths). */
export function virtualPathsFromRelativeFiles(relativeFiles: string[]): string[] {
  return relativeFiles
    .filter((f) => isAssetsRelativePath(f) && !f.endsWith("/"))
    .map((f) => virtualPathFromRelativeAssetFile(f));
}
