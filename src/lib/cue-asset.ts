import type { AssetDragPayload } from "./drag";
import type { AssetKind, Cue } from "../types/cue";
import type { VfsEntry } from "../stores/vfs";
import { vfsHas } from "../vfs/engine";

export function assetPayloadMatchesCue(
  cue: Cue,
  payload: AssetDragPayload,
): boolean {
  return cueNeedsAsset(cue) && cue.type === payload.kind;
}

export function filterAssetsForCue(entries: VfsEntry[], cue: Cue): VfsEntry[] {
  if (!cueNeedsAsset(cue)) return [];
  return entries.filter((e) => e.kind === cue.type);
}

export const ASSET_FILE_ACCEPT: Record<AssetKind, string> = {
  audio: "audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac,.aiff,.aif",
  video: "video/*,.mp4,.webm,.mov,.mkv,.m4v",
  image: "image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.tif,.tiff,.heic",
};

export function cueNeedsAsset(cue: Cue): boolean {
  return cue.type === "audio" || cue.type === "video" || cue.type === "image";
}

export function getCueAssetWarning(
  cue: Cue,
): { title: string; detail: string } | null {
  if (!cueNeedsAsset(cue)) return null;
  if (!cue.assetPath) {
    return {
      title: "No asset assigned",
      detail: "Select an asset",
    };
  }
  if (!vfsHas(cue.assetPath)) {
    return {
      title: "Asset not loaded",
      detail: "Asset missing from project",
    };
  }
  return null;
}

export function cueMissingAsset(cue: Cue): boolean {
  return getCueAssetWarning(cue) !== null;
}
