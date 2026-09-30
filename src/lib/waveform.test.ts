import { describe, expect, it } from "vitest";
import {
  computeWaveformPeaks,
  getWaveformDetailPeaks,
  getWaveformPeaks,
  WAVEFORM_DETAIL_PEAK_COUNT,
  WAVEFORM_PEAK_COUNT,
} from "./waveform";

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

describe("waveform detail peaks", () => {
  it("computes the detail bin count and caches per buffer", async () => {
    const buffer = fakeBuffer([ramp(WAVEFORM_DETAIL_PEAK_COUNT * 4, 1)]);
    const first = getWaveformDetailPeaks(buffer);
    expect(getWaveformDetailPeaks(buffer)).toBe(first);
    const peaks = await first;
    expect(peaks).toHaveLength(WAVEFORM_DETAIL_PEAK_COUNT);
    expect(peaks).toEqual(computeWaveformPeaks(buffer, WAVEFORM_DETAIL_PEAK_COUNT));
    expect(peaks[WAVEFORM_DETAIL_PEAK_COUNT - 1]).toBe(1);
  });

  it("fills every bin when the file is shorter than the bin count", () => {
    const peaks = computeWaveformPeaks(fakeBuffer([new Float32Array(100).fill(0.5)]), 400);
    expect(Math.min(...peaks)).toBe(1);
  });
});
