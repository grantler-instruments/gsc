import { t } from "../i18n/t";
import type { Cue, FadeCueType } from "../types/cue";
import type { Fixture } from "../types/fixture";
import { normalizeDmxCueData, resolveLightFadeDmx } from "./dmx";
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

export function isValidFadeTarget(fadeType: FadeCueType, target: Cue | undefined): boolean {
  if (!target || isFadeCue(target) || target.type === "stop" || target.type === "wait") {
    return false;
  }
  if (fadeType === "volumeFade") return canVolumeFadeTarget(target);
  if (fadeType === "lightFade") return canLightFadeTarget(target);
  return canOpacityFadeTarget(target);
}

export function fadeCueLabel(fadeType: FadeCueType): string {
  if (fadeType === "volumeFade") return t("cueType.volumeFade");
  if (fadeType === "lightFade") return t("cueType.lightFade");
  return t("cueType.opacityFade");
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

export function resolveLightFadeEndDmx(fadeCue: Cue, cues: Cue[], fixtures: Fixture[]) {
  if (!isLightFadeCue(fadeCue) || !fadeCue.dmx) return null;

  const target = fadeCue.fadeTargetId
    ? cues.find((cue) => cue.id === fadeCue.fadeTargetId)
    : undefined;
  if (target?.type === "dmx" && target.dmx) {
    return resolveLightFadeDmx(fadeCue.dmx, target.dmx, fixtures);
  }

  return normalizeDmxCueData(fadeCue.dmx, fixtures);
}

export function isLightFadeReady(fadeCue: Cue, fixtures: Fixture[], cues: Cue[] = []): boolean {
  const endDmx = resolveLightFadeEndDmx(fadeCue, cues, fixtures);
  if (!endDmx) return false;
  return buildDmxFadePlan(endDmx, fixtures) !== null;
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
