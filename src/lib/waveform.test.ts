import { describe, expect, it } from "vitest";
import { computeWaveformPeaks, getWaveformPeaks, WAVEFORM_PEAK_COUNT } from "./waveform";

function fakeBuffer(channels: Float32Array[]): AudioBuffer {
  return {
    length: channels[0].length,
    numberOfChannels: channels.length,
    getChannelData: (c: number) => channels[c],
  } as unknown as AudioBuffer;
}

function ramp(length: number, sign: number): Float32Array {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) data[i] = (sign * i) / length;
  return data;
}

describe("waveform peaks", () => {
  it("peaks the mono mix and normalizes to 1", () => {
    const peaks = computeWaveformPeaks(fakeBuffer([ramp(2800, 1), ramp(2800, 1)]));
    expect(peaks).toHaveLength(WAVEFORM_PEAK_COUNT);
    expect(peaks[WAVEFORM_PEAK_COUNT - 1]).toBe(1);
    expect(peaks[0]).toBeLessThan(peaks[WAVEFORM_PEAK_COUNT - 1]);
  });

  it("cancels opposite channels like a mono mixdown", () => {
    const peaks = computeWaveformPeaks(fakeBuffer([ramp(2800, 1), ramp(2800, -1)]));
    expect(Math.max(...peaks)).toBe(0);
  });

  it("matches the sync result across slices and caches per buffer", async () => {
    const buffer = fakeBuffer([ramp(3_000_000, 1), ramp(3_000_000, 0.5)]);
    const first = getWaveformPeaks(buffer);
    expect(getWaveformPeaks(buffer)).toBe(first);
    expect(await first).toEqual(computeWaveformPeaks(buffer));
  });
});
