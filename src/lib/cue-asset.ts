import { t } from "../i18n/t";
import { isRemoteClient } from "../platform/remote-mode";
import type { VfsEntry } from "../stores/vfs";
import { useVfsStore } from "../stores/vfs";
import type { AssetKind, Cue } from "../types/cue";
import { normalizePath, vfsHas } from "../vfs/engine";
import type { AssetDragPayload } from "./drag";

export function cueUsesAsset(cue: Cue, assetPath: string | null | undefined): boolean {
  if (!assetPath || !cue.assetPath) return false;
  return normalizePath(cue.assetPath) === normalizePath(assetPath);
}

export function assetPayloadMatchesCue(cue: Cue, payload: AssetDragPayload): boolean {
  return cueNeedsAsset(cue) && cue.type === payload.kind;
}

export function filterAssetsForCue(entries: VfsEntry[], cue: Cue): VfsEntry[] {
  if (!cueNeedsAsset(cue)) return [];
  return entries.filter((e) => e.kind === cue.type && e.loaded);
}

export const ASSET_FILE_ACCEPT: Record<AssetKind, string> = {
  audio: "audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac,.aiff,.aif",
  video: "video/*,.mp4,.webm,.mov,.mkv,.m4v",
  image: "image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.tif,.tiff,.heic",
};

export function cueNeedsAsset(cue: Cue): boolean {
  return cue.type === "audio" || cue.type === "video" || cue.type === "image";
}

function findAssetEntry(entries: VfsEntry[], assetPath: string): VfsEntry | undefined {
  const normalized = normalizePath(assetPath);
  return entries.find((entry) => normalizePath(entry.path) === normalized);
}

export function getCueAssetWarning(
  cue: Cue,
  entries: VfsEntry[] = useVfsStore.getState().entries,
): { title: string; detail: string } | null {
  // Playback stays on the booth; media loads over HTTP for waveforms/thumbnails only.
  if (isRemoteClient()) return null;
  if (!cueNeedsAsset(cue)) return null;
  if (!cue.assetPath) {
    return {
      title: t("assets.noAssetAssigned"),
      detail: t("assets.selectAnAsset"),
    };
  }
  if (!vfsHas(cue.assetPath)) {
    const entry = findAssetEntry(entries, cue.assetPath);
    if (entry) {
      return {
        title: t("assets.assetNotLoaded"),
        detail: t("assets.fileNotAvailable"),
      };
    }
    return {
      title: t("assets.assetNotLoaded"),
      detail: t("assets.assetMissingFromProject"),
    };
  }
  return null;
}

export function cueMissingAsset(
  cue: Cue,
  entries: VfsEntry[] = useVfsStore.getState().entries,
): boolean {
  if (isRemoteClient()) return false;
  return getCueAssetWarning(cue, entries) !== null;
}
