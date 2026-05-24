import type { CueType } from "../types/cue";
import { t } from "./t";

export function getCueTypeLabel(type: CueType): string {
  return t(`cueType.${type}`);
}

export function getAssetKindLabel(kind: "audio" | "video" | "image"): string {
  return t(`cueType.${kind}`);
}
