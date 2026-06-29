import { t } from "../i18n/t";
import { isRemoteClient } from "../platform/remote-mode";
import type { VfsEntry } from "../stores/vfs";
import { useVfsStore } from "../stores/vfs";
import type { AssetKind, Cue } from "../types/cue";
import { normalizePath, vfsHas } from "../vfs/engine";
import type { CueList } from "./cue-lists";
import type { AssetDragPayload } from "./drag";

export function cueUsesAsset(cue: Cue, assetPath: string | null | undefined): boolean {
  if (!assetPath || !cue.assetPath) return false;
  return normalizePath(cue.assetPath) === normalizePath(assetPath);
}

/** A cue that references an asset, paired with the cue list it lives in. */
export interface AssetCueUsage {
  cueId: string;
  number: string;
  name: string;
  listId: string;
  listName: string;
}

/** Collect every cue across all cue lists that references the given asset path. */
export function findAssetCueUsages(cueLists: CueList[], assetPath: string): AssetCueUsage[] {
  const usages: AssetCueUsage[] = [];
  for (const list of cueLists) {
    for (const cue of list.cues) {
      if (cueUsesAsset(cue, assetPath)) {
        usages.push({
          cueId: cue.id,
          number: cue.number,
          name: cue.name,
          listId: list.id,
          listName: list.name,
        });
      }
    }
  }
  return usages;
}

export function assetPayloadMatchesCue(cue: Cue, payload: AssetDragPayload): boolean {
  return cueNeedsAsset(cue) && cue.type === payload.kind;
}

export function filterAssetsForCue(entries: VfsEntry[], cue: Cue): VfsEntry[] {
  if (!cueNeedsAsset(cue)) return [];
  return entries.filter((e) => e.kind === cue.type && e.loaded);
}

export type AssetListSort = "name-asc" | "name-desc" | "type-asc" | "type-desc";

export const MEDIA_ASSET_KINDS = [
  "audio",
  "video",
  "image",
] as const satisfies readonly AssetKind[];

export function createDefaultAssetKindFilter(): Set<AssetKind> {
  return new Set(MEDIA_ASSET_KINDS);
}

export function isDefaultAssetKindFilter(enabledKinds: ReadonlySet<AssetKind>): boolean {
  return enabledKinds.size === MEDIA_ASSET_KINDS.length;
}

export function countActiveAssetFilters(
  query: string,
  enabledKinds: ReadonlySet<AssetKind>,
): number {
  let count = 0;
  if (query.trim()) count += 1;
  if (!isDefaultAssetKindFilter(enabledKinds)) count += 1;
  return count;
}

const MEDIA_KIND_ORDER: Record<"audio" | "video" | "image", number> = {
  audio: 0,
  video: 1,
  image: 2,
};

function compareAssetEntries(a: VfsEntry, b: VfsEntry, sort: AssetListSort): number {
  switch (sort) {
    case "name-asc":
      return a.name.localeCompare(b.name) || a.path.localeCompare(b.path);
    case "name-desc":
      return b.name.localeCompare(a.name) || b.path.localeCompare(a.path);
    case "type-asc": {
      const byKind = MEDIA_KIND_ORDER[a.kind] - MEDIA_KIND_ORDER[b.kind];
      return byKind || a.name.localeCompare(b.name);
    }
    case "type-desc": {
      const byKind = MEDIA_KIND_ORDER[b.kind] - MEDIA_KIND_ORDER[a.kind];
      return byKind || a.name.localeCompare(b.name);
    }
  }
}

export function filterAndSortAssets(
  entries: VfsEntry[],
  options: { query: string; enabledKinds: ReadonlySet<AssetKind>; sort: AssetListSort },
): VfsEntry[] {
  const query = options.query.trim().toLowerCase();
  let result = entries;

  if (options.enabledKinds.size < MEDIA_ASSET_KINDS.length) {
    result = result.filter((entry) => options.enabledKinds.has(entry.kind));
  }

  if (query) {
    result = result.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) || entry.path.toLowerCase().includes(query),
    );
  }

  return [...result].sort((a, b) => compareAssetEntries(a, b, options.sort));
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
