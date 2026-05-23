import { prefetchMediaDurations } from "../lib/media-duration";
import type { AssetKind } from "../types/cue";
import { joinPath, normalizePath, vfsHas, vfsPut } from "./engine";

const PROJECT_ROOT = "/project";

const AUDIO_EXT = new Set(["wav", "mp3", "ogg", "m4a", "aac", "flac", "aiff", "aif"]);
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "mkv", "m4v"]);
const IMAGE_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "tif",
  "tiff",
  "heic",
]);

export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

export function assetKindFromFilename(filename: string): AssetKind | null {
  const ext = extensionOf(filename);
  if (AUDIO_EXT.has(ext)) return "audio";
  if (VIDEO_EXT.has(ext)) return "video";
  if (IMAGE_EXT.has(ext)) return "image";
  return null;
}

/** @deprecated Use assetKindFromFilename */
export function mediaKindFromFilename(filename: string): AssetKind | null {
  return assetKindFromFilename(filename);
}

export interface ImportedAsset {
  path: string;
  name: string;
  size: number;
  mimeType: string;
  kind: AssetKind;
}

/** Import files into the VFS under /project/… preserving relative paths when possible. */
export async function importFiles(
  files: File[],
  options?: { baseRelativePath?: string },
): Promise<ImportedAsset[]> {
  const imported: ImportedAsset[] = [];
  const base = options?.baseRelativePath ?? "";

  for (const file of files) {
    const kind = assetKindFromFilename(file.name);
    if (!kind) continue;

    const relative = base
      ? joinPath(PROJECT_ROOT, joinPath(base, file.name))
      : joinPath(PROJECT_ROOT, file.webkitRelativePath || file.name);

    const path = normalizePath(relative);
    if (!vfsHas(path)) {
      vfsPut(path, file);
    }

    imported.push({
      path,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      kind,
    });
  }

  prefetchMediaDurations(
    imported.filter((a) => a.kind === "audio" || a.kind === "video").map((a) => a.path),
  );

  return imported;
}

export function assetKindFromPath(path: string): AssetKind {
  const name = path.split("/").pop() ?? path;
  return assetKindFromFilename(name) ?? "audio";
}

const MIME_BY_EXT: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  aiff: "audio/aiff",
  aif: "audio/aiff",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  m4v: "video/mp4",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
};

export function mimeTypeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "";
}
