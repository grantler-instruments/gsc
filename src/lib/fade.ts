import type { Cue, FadeCueType } from "../types/cue";
import type { Fixture } from "../types/fixture";
import { buildDmxFadePlan } from "./dmx-fade";

export function isVolumeFadeCue(cue: Cue): boolean {
  return cue.type === "volumeFade";
}

export function isOpacityFadeCue(cue: Cue): boolean {
  return cue.type === "opacityFade";
}

export function isLightFadeCue(cue: Cue): boolean {
  return cue.type === "lightFade";
}

export function isFadeCue(cue: Cue): boolean {
  return isVolumeFadeCue(cue) || isOpacityFadeCue(cue) || isLightFadeCue(cue);
}

export function canVolumeFadeTarget(cue: Cue): boolean {
  return cue.type === "audio" || cue.type === "video";
}

export function canOpacityFadeTarget(cue: Cue): boolean {
  return cue.type === "video" || cue.type === "image";
}

export function canLightFadeTarget(cue: Cue): boolean {
  return cue.type === "dmx" && Boolean(cue.dmx);
}

export function isValidFadeTarget(
  fadeType: FadeCueType,
  target: Cue | undefined,
): boolean {
  if (
    !target ||
    isFadeCue(target) ||
    target.type === "stop" ||
    target.type === "wait"
  ) {
    return false;
  }
  if (fadeType === "volumeFade") return canVolumeFadeTarget(target);
  if (fadeType === "lightFade") return canLightFadeTarget(target);
  return canOpacityFadeTarget(target);
}

export function fadeCueLabel(fadeType: FadeCueType): string {
  if (fadeType === "volumeFade") return "Volume fade";
  if (fadeType === "lightFade") return "Light fade";
  return "Opacity fade";
}

export function defaultFadeCueFields(fadeType: FadeCueType): {
  fadeDuration: number;
  fadeFrom?: number;
  fadeTo?: number;
} {
  if (fadeType === "lightFade") {
    return { fadeDuration: 2 };
  }
  return { fadeDuration: 2, fadeTo: 0 };
}

export function isLightFadeReady(fadeCue: Cue, fixtures: Fixture[]): boolean {
  if (!isLightFadeCue(fadeCue) || !fadeCue.dmx) return false;
  return buildDmxFadePlan(fadeCue.dmx, fixtures) !== null;
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
