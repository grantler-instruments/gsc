import { getFadeTarget } from "./cues";
import { isOpacityFadeCue, isVolumeFadeCue } from "./fade";
import {
  resolveEffectiveOpacity,
  resolveEffectiveVolume,
  useFadeStore,
} from "../stores/fade";
import type { Cue } from "../types/cue";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function resolveFadeFromLevel(fadeCue: Cue, target: Cue): number {
  if (isVolumeFadeCue(fadeCue)) {
    return resolveEffectiveVolume(target.id, target.volume ?? 1);
  }
  if (isOpacityFadeCue(fadeCue)) {
    return resolveEffectiveOpacity(target.id, target.opacity ?? 1);
  }
  return clamp01(fadeCue.fadeFrom ?? 1);
}

/** Start a timed fade on the target cue's volume or opacity. */
export function triggerFadeCue(fadeCue: Cue, cues: Cue[]): boolean {
  const target = getFadeTarget(fadeCue, cues);
  if (!target) return false;

  const from = clamp01(resolveFadeFromLevel(fadeCue, target));
  const to = clamp01(fadeCue.fadeTo ?? 0);
  const durationSec = Math.max(0.01, fadeCue.fadeDuration ?? 2);

  if (isVolumeFadeCue(fadeCue)) {
    useFadeStore.getState().startFade({
      targetId: target.id,
      property: "volume",
      from,
      to,
      startedAtMs: performance.now(),
      durationSec,
      sourceFadeCueId: fadeCue.id,
    });
    return true;
  }

  if (isOpacityFadeCue(fadeCue)) {
    useFadeStore.getState().startFade({
      targetId: target.id,
      property: "opacity",
      from,
      to,
      startedAtMs: performance.now(),
      durationSec,
      sourceFadeCueId: fadeCue.id,
    });
    return true;
  }

  return false;
}
