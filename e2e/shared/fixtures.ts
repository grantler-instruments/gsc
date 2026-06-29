import path from "node:path";
import { fileURLToPath } from "node:url";

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

export const WHITE_NOISE_FIXTURE = path.join(fixturesDir, "white-noise.wav");
export const WHITE_NOISE_NAME = "white-noise.wav";
export const WHITE_NOISE_ALT_FIXTURE = path.join(fixturesDir, "white-noise-alt.wav");
export const WHITE_NOISE_ALT_NAME = "white-noise-alt.wav";

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
};

export function fixturePath(fileName: string): string {
  return path.join(fixturesDir, fileName);
}

export function mimeTypeForFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}
