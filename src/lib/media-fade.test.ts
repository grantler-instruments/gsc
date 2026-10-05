import { describe, expect, it } from "vitest";
import type { Cue } from "../types/cue";
import {
  clampMediaFadeSec,
  createMediaFadeEnvelope,
  fadeCurveValue,
  hasMediaFadeEnvelope,
  isMediaFadeAnimating,
  MEDIA_FADE_CURVES,
  mediaFadeGain,
  mediaFadeGainAt,
} from "./media-fade";

function audioCue(patch: Partial<Cue> = {}): Cue {
  return { id: "a", number: "1", name: "A", type: "audio", assetPath: "a.wav", ...patch };
}

describe("fadeCurveValue", () => {
  it.each(MEDIA_FADE_CURVES)("%s runs from silence to full and rises monotonically", (curve) => {
    expect(fadeCurveValue(curve, 0)).toBeCloseTo(0, 6);
    expect(fadeCurveValue(curve, 1)).toBeCloseTo(1, 6);
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const v = fadeCurveValue(curve, i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("shapes the midpoint per curve", () => {
    expect(fadeCurveValue("linear", 0.5)).toBeCloseTo(0.5);
    expect(fadeCurveValue("equalPower", 0.5)).toBeCloseTo(Math.SQRT1_2);
    expect(fadeCurveValue("sCurve", 0.5)).toBeCloseTo(0.5);
    expect(fadeCurveValue("sCurve", 0.25)).toBeLessThan(0.25);
    expect(fadeCurveValue("exponential", 0.5)).toBeLessThan(0.05);
  });

  it("clamps progress outside 0–1", () => {
    expect(fadeCurveValue("linear", -1)).toBe(0);
    expect(fadeCurveValue("linear", 2)).toBe(1);
  });
});

describe("createMediaFadeEnvelope", () => {
  it("has no fades by default, so playback starts at full level", () => {
    const envelope = createMediaFadeEnvelope(audioCue(), 10);
    expect(hasMediaFadeEnvelope(envelope)).toBe(false);
    expect(mediaFadeGain(envelope, 0)).toBe(1);
    expect(mediaFadeGain(envelope, 9.99)).toBe(1);
  });

  it("covers every loop pass for finite loops and drops the end for infinite ones", () => {
    expect(createMediaFadeEnvelope(audioCue({ loop: true, loopCount: 3 }), 4).totalRunSec).toBe(12);
    expect(createMediaFadeEnvelope(audioCue({ loop: true }), 4).totalRunSec).toBeUndefined();
    expect(createMediaFadeEnvelope(audioCue(), undefined).totalRunSec).toBeUndefined();
  });

  it("ignores fade fields on cue types without built-in fades", () => {
    const envelope = createMediaFadeEnvelope(audioCue({ type: "midi", fadeIn: 2 }), 1);
    expect(envelope.fadeInSec).toBe(0);
  });
});

describe("mediaFadeGain", () => {
  const envelope = createMediaFadeEnvelope(audioCue({ fadeIn: 2, fadeOut: 4 }), 10);

  it("fades in from GO and out before the end of the slice", () => {
    expect(mediaFadeGain(envelope, 0)).toBe(0);
    expect(mediaFadeGain(envelope, 1)).toBeCloseTo(0.5);
    expect(mediaFadeGain(envelope, 2)).toBe(1);
    expect(mediaFadeGain(envelope, 6)).toBe(1);
    expect(mediaFadeGain(envelope, 8)).toBeCloseTo(0.5);
    expect(mediaFadeGain(envelope, 10)).toBe(0);
  });

  it("only fades out at the end of the last loop pass", () => {
    const looped = createMediaFadeEnvelope(audioCue({ fadeOut: 1, loop: true, loopCount: 2 }), 5);
    expect(mediaFadeGain(looped, 4.5)).toBe(1);
    expect(mediaFadeGain(looped, 9.5)).toBeCloseTo(0.5);
  });

  it("ramps a release down from the current level", () => {
    const flat = createMediaFadeEnvelope(audioCue({ fadeOut: 2 }), 60);
    expect(mediaFadeGain(flat, 5, { elapsedSec: 0, durationSec: 2 })).toBe(1);
    expect(mediaFadeGain(flat, 6, { elapsedSec: 1, durationSec: 2 })).toBeCloseTo(0.5);
    expect(mediaFadeGain(flat, 7, { elapsedSec: 2, durationSec: 2 })).toBe(0);
    // Released mid fade-in: both ramps multiply.
    expect(mediaFadeGain(envelope, 1, { elapsedSec: 0, durationSec: 4 })).toBeCloseTo(0.5);
  });

  it("converts wall-clock times", () => {
    expect(mediaFadeGainAt(envelope, 1_000, 2_000)).toBeCloseTo(0.5);
    expect(
      mediaFadeGainAt(envelope, 1_000, 6_000, { startedAtMs: 5_000, durationSec: 2 }),
    ).toBeCloseTo(0.5);
  });
});

describe("isMediaFadeAnimating", () => {
  const envelope = createMediaFadeEnvelope(audioCue({ fadeIn: 1, fadeOut: 1 }), 10);

  it("is true only inside a ramp or a release", () => {
    expect(isMediaFadeAnimating(envelope, 0, 500)).toBe(true);
    expect(isMediaFadeAnimating(envelope, 0, 5_000)).toBe(false);
    expect(isMediaFadeAnimating(envelope, 0, 9_500)).toBe(true);
    expect(isMediaFadeAnimating(envelope, 0, 5_000, { startedAtMs: 5_000, durationSec: 1 })).toBe(
      true,
    );
  });
});

describe("clampMediaFadeSec", () => {
  it("keeps fade in + fade out within the slice", () => {
    expect(clampMediaFadeSec(8, 4, 10)).toBe(6);
    expect(clampMediaFadeSec(-1, 0, 10)).toBe(0);
    expect(clampMediaFadeSec(30, 0)).toBe(30);
  });
});
