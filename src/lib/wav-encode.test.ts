import { describe, expect, it } from "vitest";
import { encodeWavMono, hasAudibleSamples, mergeFloat32Chunks } from "./wav-encode";

describe("mergeFloat32Chunks", () => {
  it("concatenates chunks in order", () => {
    const merged = mergeFloat32Chunks([new Float32Array([0.1, 0.2]), new Float32Array([0.3])]);
    expect(merged.length).toBe(3);
    expect(merged[0]).toBeCloseTo(0.1);
    expect(merged[1]).toBeCloseTo(0.2);
    expect(merged[2]).toBeCloseTo(0.3);
  });

  it("returns empty array for no chunks", () => {
    expect(mergeFloat32Chunks([]).length).toBe(0);
  });
});

describe("encodeWavMono", () => {
  it("produces a valid RIFF/WAVE header", () => {
    const samples = new Float32Array([0, 0.5, -0.5]);
    const blob = encodeWavMono(samples, 44100);
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(44 + samples.length * 2);
  });

  it("encodes 16-bit PCM samples", async () => {
    const samples = new Float32Array([0, 1, -1]);
    const blob = encodeWavMono(samples, 22050);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);

    expect(
      String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)),
    ).toBe("RIFF");
    expect(
      String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)),
    ).toBe("WAVE");
    expect(view.getUint32(24, true)).toBe(22050);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x8000);
  });
});

describe("hasAudibleSamples", () => {
  it("detects non-silent audio", () => {
    expect(hasAudibleSamples(new Float32Array([0, 0.01, 0]))).toBe(true);
  });

  it("rejects silence", () => {
    expect(hasAudibleSamples(new Float32Array([0, 0, 0]))).toBe(false);
  });
});
