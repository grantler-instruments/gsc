import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMediaFadeEnvelope } from "../lib/media-fade";
import type { Cue } from "../types/cue";
import { scheduleFadeEnvelope } from "./fade-envelope";

function mockParam() {
  return {
    value: 1,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    setValueCurveAtTime: vi.fn(),
  };
}

const ctx = { currentTime: 100 } as BaseAudioContext;
const cue: Cue = { id: "a", number: "1", name: "A", type: "audio", fadeIn: 2, fadeOut: 3 };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("scheduleFadeEnvelope", () => {
  it("schedules a fade in at GO and a fade out before the end", () => {
    const param = mockParam();
    scheduleFadeEnvelope(
      param as unknown as AudioParam,
      ctx,
      createMediaFadeEnvelope(cue, 10),
      10_000,
    );
    expect(param.cancelScheduledValues).toHaveBeenCalled();
    const calls = param.setValueCurveAtTime.mock.calls;
    expect(calls).toHaveLength(2);
    const [inCurve, inStart, inDuration] = calls[0];
    expect(inStart).toBe(100);
    expect(inDuration).toBeCloseTo(2);
    expect(inCurve[0]).toBe(0);
    expect(inCurve[inCurve.length - 1]).toBeCloseTo(1);
    const [outCurve, outStart, outDuration] = calls[1];
    expect(outStart).toBeCloseTo(107);
    expect(outDuration).toBeCloseTo(3);
    expect(outCurve[0]).toBeCloseTo(1);
    expect(outCurve[outCurve.length - 1]).toBeCloseTo(0);
  });

  it("resumes mid fade when scheduled after GO (seek or restart)", () => {
    const param = mockParam();
    scheduleFadeEnvelope(
      param as unknown as AudioParam,
      ctx,
      createMediaFadeEnvelope(cue, 10),
      9_000,
    );
    const [curve, start, duration] = param.setValueCurveAtTime.mock.calls[0];
    expect(start).toBe(100);
    expect(duration).toBeCloseTo(1);
    expect(curve[0]).toBeCloseTo(0.5);
  });

  it("holds full level without fades", () => {
    const param = mockParam();
    scheduleFadeEnvelope(
      param as unknown as AudioParam,
      ctx,
      createMediaFadeEnvelope({ ...cue, fadeIn: 0, fadeOut: 0 }, 10),
      10_000,
    );
    expect(param.setValueCurveAtTime).not.toHaveBeenCalled();
    expect(param.setValueAtTime).toHaveBeenCalledWith(1, 100);
  });

  it("replaces the end fade with a release ramp on a fading stop", () => {
    const param = mockParam();
    scheduleFadeEnvelope(
      param as unknown as AudioParam,
      ctx,
      createMediaFadeEnvelope(cue, 60),
      5_000,
      { startedAtMs: 10_000, durationSec: 3 },
    );
    const calls = param.setValueCurveAtTime.mock.calls;
    expect(calls).toHaveLength(1);
    const [curve, start, duration] = calls[0];
    expect(start).toBe(100);
    expect(duration).toBeCloseTo(3);
    expect(curve[0]).toBeCloseTo(1);
    expect(curve[curve.length - 1]).toBeCloseTo(0);
  });

  it("falls back to a static level when the browser rejects the curve", () => {
    const param = mockParam();
    param.setValueCurveAtTime.mockImplementation(() => {
      throw new Error("overlap");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    scheduleFadeEnvelope(
      param as unknown as AudioParam,
      ctx,
      createMediaFadeEnvelope(cue, 10),
      9_000,
    );
    expect(param.value).toBeCloseTo(0.5);
    warn.mockRestore();
  });
});
