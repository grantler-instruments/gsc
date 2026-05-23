import { buildDmxFadePlan } from "./dmx-fade";
import { applyDmxCueToBuffers, normalizeDmxCueData } from "./dmx";
import { getFadeTarget } from "./cues";
import {
  isLightFadeCue,
  isOpacityFadeCue,
  isVolumeFadeCue,
} from "./fade";
import {
  resolveEffectiveOpacity,
  resolveEffectiveVolume,
  useFadeStore,
} from "../stores/fade";
import { useProjectStore } from "../stores/project";
import type { Cue } from "../types/cue";
import { sendDmxUniverses } from "../platform/send-dmx";

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

function triggerLightFadeCue(fadeCue: Cue): boolean {
  if (!fadeCue.dmx) return false;

  const fixtures = useProjectStore.getState().fixtures;
  const endDmx = normalizeDmxCueData(fadeCue.dmx, fixtures);
  const plan = buildDmxFadePlan(endDmx, fixtures);
  if (!plan) return false;

  const durationSec = Math.max(0.01, fadeCue.fadeDuration ?? 2);
  useFadeStore.getState().startDmxFade({
    fadeCueId: fadeCue.id,
    startedAtMs: performance.now(),
    durationSec,
    plan,
    endDmx,
    sourceFadeCueId: fadeCue.id,
  });
  return true;
}

/** Start a timed fade on the target cue's volume, opacity, or light levels. */
export function triggerFadeCue(fadeCue: Cue, cues: Cue[]): boolean {
  if (isLightFadeCue(fadeCue)) {
    return triggerLightFadeCue(fadeCue);
  }

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

/** Commit the final light levels when a DMX fade completes. */
export function finalizeLightFade(endDmx: Cue["dmx"]): void {
  if (!endDmx) return;
  const fixtures = useProjectStore.getState().fixtures;
  const frames = applyDmxCueToBuffers(endDmx, fixtures);
  void sendDmxUniverses(frames);
}
