import { normalizePath } from "../vfs/engine";

export const PROJECT_JSON = "project.json";
export const ASSETS_DIR = "assets";
export const VFS_ASSETS_ROOT = "/assets";
/** Desktop project package directory (folder named `ShowName.gsc`). */
export const PROJECT_DIR_EXTENSION = ".gsc";
/** Portable zip bundle for moving shows between web and desktop. */
export const BUNDLE_EXTENSION = ".gsc.zip";

export function isProjectBundlePath(path: string): boolean {
  return path.toLowerCase().endsWith(BUNDLE_EXTENSION);
}

export function sanitizeShowName(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "Untitled_Show";
}

export function isGscProjectDirName(name: string): boolean {
  return name.toLowerCase().endsWith(PROJECT_DIR_EXTENSION);
}

export function isGscProjectDirPath(path: string): boolean {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  const leaf = parts[parts.length - 1] ?? "";
  return isGscProjectDirName(leaf);
}

/** Default folder name for a new desktop project (always ends with `.gsc`). */
export function projectDirNameFromShowName(name: string): string {
  const base = sanitizeShowName(name);
  return isGscProjectDirName(base) ? base : `${base}${PROJECT_DIR_EXTENSION}`;
}

/** Normalize a save-dialog path into a `.gsc` project directory. */
export function projectRootFromSavePath(savePath: string): string {
  const trimmed = savePath.replace(/[/\\]+$/, "").replace(/\.(gsc\.zip|zip)$/i, "");
  const sep = trimmed.includes("\\") ? "\\" : "/";
  const parts = trimmed.split(/[/\\]/);
  const leaf = parts[parts.length - 1] ?? trimmed;
  if (!isGscProjectDirName(leaf)) {
    parts[parts.length - 1] = `${leaf}${PROJECT_DIR_EXTENSION}`;
  }
  return parts.join(sep);
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

export function isAssetsRelativePath(relativePath: string): boolean {
  return relativePath.startsWith(`${ASSETS_DIR}/`) || relativePath === ASSETS_DIR;
}

export function virtualPathFromRelativeAssetFile(relativePath: string): string {
  return normalizePath(`/${relativePath}`);
}

export function assetRelativePath(virtualPath: string): string {
  const rel = virtualToRelative(normalizePath(virtualPath));
  if (rel.startsWith(`${ASSETS_DIR}/`) || rel === ASSETS_DIR) {
    return rel;
  }
  return `${ASSETS_DIR}/${rel.replace(/^assets\/?/, "")}`;
}
