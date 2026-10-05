import type { Cue, MediaFadeCurve } from "../types/cue";
import { getLoopPlayCount } from "./loop";

export const MEDIA_FADE_CURVES: MediaFadeCurve[] = [
  "linear",
  "equalPower",
  "sCurve",
  "exponential",
];

export const DEFAULT_MEDIA_FADE_CURVE: MediaFadeCurve = "linear";

/** Dynamic range of the exponential curve (dB from silence floor to full). */
const EXPONENTIAL_RANGE_DB = 60;
const EXPONENTIAL_FLOOR = 10 ** (-EXPONENTIAL_RANGE_DB / 20);

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Cue types that support built-in fade in / fade out. */
export function supportsMediaFades(cue: Cue): boolean {
  return cue.type === "audio" || cue.type === "video" || cue.type === "tts" || cue.type === "image";
}

export function mediaFadeInSec(cue: Cue): number {
  return supportsMediaFades(cue) ? Math.max(0, cue.fadeIn ?? 0) : 0;
}

export function mediaFadeOutSec(cue: Cue): number {
  return supportsMediaFades(cue) ? Math.max(0, cue.fadeOut ?? 0) : 0;
}

export function mediaFadeCurve(cue: Cue): MediaFadeCurve {
  return cue.fadeCurve ?? DEFAULT_MEDIA_FADE_CURVE;
}

/**
 * Fade-in shape: maps progress 0–1 to level 0–1. A fade out uses the same
 * shape mirrored in time, so both ends of a cue sound symmetric.
 */
export function fadeCurveValue(curve: MediaFadeCurve, progress: number): number {
  const x = clamp01(progress);
  switch (curve) {
    case "equalPower":
      return Math.sin((x * Math.PI) / 2);
    case "sCurve":
      return (1 - Math.cos(Math.PI * x)) / 2;
    case "exponential":
      if (x <= 0) return 0;
      return clamp01(
        (10 ** ((EXPONENTIAL_RANGE_DB / 20) * (x - 1)) - EXPONENTIAL_FLOOR) /
          (1 - EXPONENTIAL_FLOOR),
      );
    default:
      return x;
  }
}

/** Fade timing for one GO of a cue, in seconds of run time. */
export interface MediaFadeEnvelope {
  fadeInSec: number;
  fadeOutSec: number;
  curve: MediaFadeCurve;
  /** Length of the whole run (all loops); undefined when infinite or unknown. */
  totalRunSec?: number;
}

/** A stop that fades the cue out instead of cutting it. */
export interface MediaFadeRelease {
  /** Wall-clock ms when the stop fired. */
  startedAtMs: number;
  durationSec: number;
}

/**
 * Envelope for a cue whose in→out slice is `sliceSec` long. Fades sit inside the
 * slice: fade in at the start of the first pass, fade out at the end of the last.
 */
export function createMediaFadeEnvelope(cue: Cue, sliceSec: number | undefined): MediaFadeEnvelope {
  const plays = getLoopPlayCount(cue);
  const totalRunSec =
    sliceSec !== undefined && sliceSec > 0 && plays !== "inf" ? sliceSec * plays : undefined;
  return {
    fadeInSec: mediaFadeInSec(cue),
    fadeOutSec: mediaFadeOutSec(cue),
    curve: mediaFadeCurve(cue),
    totalRunSec,
  };
}

export function hasMediaFadeEnvelope(envelope: MediaFadeEnvelope): boolean {
  return envelope.fadeInSec > 0 || (envelope.fadeOutSec > 0 && envelope.totalRunSec !== undefined);
}

/**
 * Gain multiplier (0–1) at `elapsedSec` into the run. `releaseElapsedSec` is the
 * time since a fading stop fired; the release ramps down from wherever the
 * envelope is at that moment.
 */
export function mediaFadeGain(
  envelope: MediaFadeEnvelope,
  elapsedSec: number,
  release?: { elapsedSec: number; durationSec: number },
): number {
  const { fadeInSec, fadeOutSec, curve, totalRunSec } = envelope;
  let gain = 1;
  if (fadeInSec > 0 && elapsedSec < fadeInSec) {
    gain *= fadeCurveValue(curve, elapsedSec / fadeInSec);
  }
  if (fadeOutSec > 0 && totalRunSec !== undefined) {
    const remaining = totalRunSec - elapsedSec;
    if (remaining < fadeOutSec) gain *= fadeCurveValue(curve, remaining / fadeOutSec);
  }
  if (release) {
    gain *=
      release.durationSec > 0
        ? fadeCurveValue(curve, 1 - release.elapsedSec / release.durationSec)
        : 0;
  }
  return clamp01(gain);
}

/** Gain at wall-clock `nowMs` for a cue triggered at `goAtMs`. */
export function mediaFadeGainAt(
  envelope: MediaFadeEnvelope,
  goAtMs: number,
  nowMs: number,
  release?: MediaFadeRelease,
): number {
  return mediaFadeGain(
    envelope,
    (nowMs - goAtMs) / 1000,
    release
      ? { elapsedSec: (nowMs - release.startedAtMs) / 1000, durationSec: release.durationSec }
      : undefined,
  );
}

/** True while the envelope still changes over time (needs per-frame updates). */
export function isMediaFadeAnimating(
  envelope: MediaFadeEnvelope,
  goAtMs: number,
  nowMs: number,
  release?: MediaFadeRelease,
): boolean {
  if (release) return true;
  const elapsedSec = (nowMs - goAtMs) / 1000;
  if (envelope.fadeInSec > 0 && elapsedSec < envelope.fadeInSec) return true;
  if (envelope.fadeOutSec > 0 && envelope.totalRunSec !== undefined) {
    return elapsedSec >= envelope.totalRunSec - envelope.fadeOutSec;
  }
  return false;
}

/**
 * Clamp a fade length so fade in + fade out never exceed the slice.
 * `otherSec` is the opposite fade's current length.
 */
export function clampMediaFadeSec(value: number, otherSec: number, sliceSec?: number): number {
  const v = Math.max(0, Number.isFinite(value) ? value : 0);
  if (sliceSec === undefined || sliceSec <= 0) return v;
  return Math.min(v, Math.max(0, sliceSec - otherSec));
}
