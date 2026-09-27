import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioMeters, SILENT_METER, samplePeakDb } from "./meters";
import { createMockAudioContext, createMockAudioNode } from "./test/mock-audio-context";

function setup() {
  const values = [0.5, 0.25];
  let channel = 0;
  const ctx = createMockAudioContext();
  ctx.createAnalyser = vi.fn(() => {
    const index = channel++;
    return {
      ...createMockAudioNode(),
      getFloatTimeDomainData: (data: Float32Array) => data.fill(values[index]),
    } as unknown as AnalyserNode;
  });
  const source = { ...createMockAudioNode(), disconnect: vi.fn() } as unknown as AudioNode;
  const meters = new AudioMeters();
  meters.attach("cue", ctx, source);
  return { meters, ctx, source, values };
}

afterEach(() => vi.unstubAllGlobals());

describe("audio meters", () => {
  it("measures silence, negative samples, and unclamped overload in dBFS", () => {
    expect(samplePeakDb(new Float32Array(16))).toBe(-60);
    expect(samplePeakDb(new Float32Array([-0.5, 0.1]))).toBeCloseTo(-6.0206);
    expect(samplePeakDb(new Float32Array([1.25]))).toBeCloseTo(1.9382);
  });

  it("keeps stereo channels separate, holds peaks, then decays to silence", () => {
    const { meters, values } = setup();
    meters.sample("cue", 100);
    expect(meters.getReading("cue").db[0]).toBeCloseTo(-6.0206);
    expect(meters.getReading("cue").db[1]).toBeCloseTo(-12.0412);
    values.fill(0);
    meters.sample("cue", 600);
    expect(meters.getReading("cue").peakDb[0]).toBeCloseTo(-6.0206);
    expect(meters.getReading("cue").db[0]).toBeLessThan(-20);
    meters.sample("cue", 5000);
    expect(meters.getReading("cue")).toEqual(SILENT_METER);
  });

  it("clears stale samples when the audio context is suspended", () => {
    const { meters, ctx } = setup();
    meters.sample("cue", 100);
    Object.defineProperty(ctx, "state", { value: "suspended" });
    meters.sample("cue", 5000);
    expect(meters.getReading("cue")).toEqual(SILENT_METER);
  });

  it("holds overload for two seconds and clears it after silence", () => {
    const { meters, values } = setup();
    values[1] = 1.2;
    meters.sample("cue", 100);
    expect(meters.getReading("cue").clipped).toBe(true);
    values.fill(0);
    meters.sample("cue", 1000);
    expect(meters.getReading("cue").clipped).toBe(true);
    meters.sample("cue", 2200);
    expect(meters.getReading("cue").clipped).toBe(false);
  });

  it("reconnects an existing tap without allocating nodes and disconnects only its own edge", () => {
    const { meters, ctx, source } = setup();
    meters.attach("cue", ctx, source);
    expect(ctx.createAnalyser).toHaveBeenCalledTimes(2);
    meters.remove("cue");
    expect(source.disconnect).toHaveBeenCalledWith(expect.any(Object));
    expect(meters.getReading("cue")).toBe(SILENT_METER);
  });

  it("shares the display clock and cancels it when the last view unsubscribes", () => {
    const request = vi.fn(() => 1);
    const cancel = vi.fn();
    vi.stubGlobal("requestAnimationFrame", request);
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const { meters } = setup();
    const listener = vi.fn();
    const stop1 = meters.subscribe("cue", listener);
    const stop2 = meters.subscribe("master", () => {});
    expect(request).toHaveBeenCalledTimes(1);
    meters.sample("cue", 100);
    expect(listener).toHaveBeenCalledOnce();
    meters.remove("cue");
    expect(listener).toHaveBeenCalledTimes(2);
    stop1();
    expect(cancel).not.toHaveBeenCalled();
    stop2();
    expect(cancel).toHaveBeenCalledWith(1);
  });
});
