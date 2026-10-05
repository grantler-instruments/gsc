import { type MediaFadeEnvelope, type MediaFadeRelease, mediaFadeGain } from "../lib/media-fade";

/** Curve resolution for scheduled ramps (points per second). */
const SAMPLES_PER_SEC = 200;
const MAX_SAMPLES = 8192;
/** Gap between adjacent curves; Web Audio rejects curves that touch. */
const CURVE_GAP_SEC = 0.001;

function sampleCurve(
  fromSec: number,
  toSec: number,
  gainAt: (elapsedSec: number) => number,
): Float32Array {
  const count = Math.max(2, Math.min(MAX_SAMPLES, Math.ceil((toSec - fromSec) * SAMPLES_PER_SEC)));
  const curve = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    curve[i] = gainAt(fromSec + ((toSec - fromSec) * i) / (count - 1));
  }
  return curve;
}

/**
 * Schedule the fade envelope on a dedicated gain param at audio rate, so ramps
 * stay smooth regardless of UI frame rate. Replaces anything scheduled before;
 * call again after a seek or when a fading stop starts.
 */
export function scheduleFadeEnvelope(
  param: AudioParam,
  ctx: BaseAudioContext,
  envelope: MediaFadeEnvelope,
  goAtMs: number,
  release?: MediaFadeRelease,
): void {
  const nowMs = Date.now();
  const t0 = ctx.currentTime;
  const elapsed0 = (nowMs - goAtMs) / 1000;
  const gainAt = (elapsedSec: number) =>
    mediaFadeGain(
      envelope,
      elapsedSec,
      release
        ? {
            elapsedSec: elapsedSec - (release.startedAtMs - goAtMs) / 1000,
            durationSec: release.durationSec,
          }
        : undefined,
    );

  param.cancelScheduledValues(0);

  // Segments of run time (seconds since GO) where the level changes.
  const segments: [number, number][] = [];
  if (release) {
    const releaseEnd = (release.startedAtMs - goAtMs) / 1000 + release.durationSec;
    if (releaseEnd > elapsed0) segments.push([elapsed0, releaseEnd]);
  } else {
    const { fadeInSec, fadeOutSec, totalRunSec } = envelope;
    let cursor = elapsed0;
    if (fadeInSec > 0 && cursor < fadeInSec) {
      const end =
        fadeOutSec > 0 && totalRunSec !== undefined
          ? Math.min(fadeInSec, totalRunSec - fadeOutSec)
          : fadeInSec;
      if (end > cursor) {
        segments.push([cursor, end]);
        cursor = end + CURVE_GAP_SEC;
      }
    }
    if (fadeOutSec > 0 && totalRunSec !== undefined) {
      const start = Math.max(cursor, totalRunSec - fadeOutSec);
      if (totalRunSec > start) segments.push([start, totalRunSec]);
    }
  }

  const first = segments[0];
  if (!first || first[0] - elapsed0 > CURVE_GAP_SEC / 2) {
    param.setValueAtTime(gainAt(elapsed0), t0);
  }
  try {
    for (const [from, to] of segments) {
      const startTime = t0 + Math.max(0, from - elapsed0);
      param.setValueCurveAtTime(sampleCurve(from, to, gainAt), startTime, to - from);
    }
  } catch (err) {
    // Fall back to a static level rather than leave a half-built schedule.
    console.warn("[audio] Could not schedule fade envelope", err);
    param.cancelScheduledValues(0);
    param.value = gainAt(elapsed0);
  }
}
