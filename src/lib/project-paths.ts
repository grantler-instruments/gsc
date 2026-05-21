import { normalizePath } from "../vfs/engine";

export const PROJECT_JSON = "project.json";
export const ASSETS_DIR = "project";
export const BUNDLE_EXTENSION = ".gsc.zip";

export function isProjectBundlePath(path: string): boolean {
  return path.toLowerCase().endsWith(BUNDLE_EXTENSION);
}

/** Virtual VFS path → relative path inside a project folder or zip. */
export function virtualToRelative(virtualPath: string): string {
  const normalized = normalizePath(virtualPath);
  return normalized.startsWith("/") ? normalized.slice(1) : normalized;
}

export function relativeToVirtual(relativePath: string): string {
  return normalizePath(relativePath);
}

export function projectJsonPath(rootDir: string): string {
  return `${rootDir.replace(/\/$/, "")}/${PROJECT_JSON}`;
}

export function assetRelativePath(virtualPath: string): string {
  const rel = virtualToRelative(virtualPath);
  if (rel.startsWith(`${ASSETS_DIR}/`) || rel === ASSETS_DIR) {
    return rel;
  }
  return `${ASSETS_DIR}/${rel.replace(/^project\/?/, "")}`;
}
