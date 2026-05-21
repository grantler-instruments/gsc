import type { Cue, FadeCueType } from "../types/cue";

export function isVolumeFadeCue(cue: Cue): boolean {
  return cue.type === "volumeFade";
}

export function isOpacityFadeCue(cue: Cue): boolean {
  return cue.type === "opacityFade";
}

export function isFadeCue(cue: Cue): boolean {
  return isVolumeFadeCue(cue) || isOpacityFadeCue(cue);
}

export function canVolumeFadeTarget(cue: Cue): boolean {
  return cue.type === "audio" || cue.type === "video";
}

export function canOpacityFadeTarget(cue: Cue): boolean {
  return cue.type === "video" || cue.type === "image";
}

export function isValidFadeTarget(
  fadeType: FadeCueType,
  target: Cue | undefined,
): boolean {
  if (!target || isFadeCue(target) || target.type === "stop") return false;
  if (fadeType === "volumeFade") return canVolumeFadeTarget(target);
  return canOpacityFadeTarget(target);
}

export function fadeCueLabel(fadeType: FadeCueType): string {
  return fadeType === "volumeFade" ? "Volume fade" : "Opacity fade";
}

export function defaultFadeCueFields(fadeType: FadeCueType): {
  fadeDuration: number;
  fadeFrom?: number;
  fadeTo: number;
} {
  if (fadeType === "volumeFade") {
    return { fadeDuration: 2, fadeTo: 0 };
  }
  return { fadeDuration: 2, fadeTo: 0 };
}

/** Level at GO time — target cue's current volume/opacity, not a stored fadeFrom. */
export function resolveFadeFromLevel(fadeCue: Cue, target: Cue): number {
  if (isVolumeFadeCue(fadeCue)) {
    return Math.max(0, Math.min(1, target.volume ?? 1));
  }
  if (isOpacityFadeCue(fadeCue)) {
    return Math.max(0, Math.min(1, target.opacity ?? 1));
  }
  return Math.max(0, Math.min(1, fadeCue.fadeFrom ?? 1));
}
