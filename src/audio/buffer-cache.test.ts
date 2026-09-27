import { beforeEach, expect, it, vi } from "vitest";

vi.mock("../lib/media-duration", () => ({ setMediaDurationSec: vi.fn() }));
vi.mock("../platform/vfs-asset", () => ({
  resolveAssetBlob: vi.fn(async () => new Blob(["audio"])),
}));
vi.mock("../vfs/engine", () => ({ vfsGet: vi.fn() }));

import {
  clearCachedAudioBuffer,
  evictAudioBuffer,
  getAudioCacheBytes,
  getCachedAudioBuffer,
  loadAudioBuffer,
} from "./buffer-cache";

const buffer = { length: 100, numberOfChannels: 2, duration: 1 } as AudioBuffer;
beforeEach(() => {
  clearCachedAudioBuffer("/audio");
});
it("shares one decode and buffer between concurrent cues", async () => {
  const decodeAudioData = vi.fn(async () => buffer);
  const ctx = { decodeAudioData } as unknown as AudioContext;
  const results = await Promise.all([
    loadAudioBuffer("/audio", ctx),
    loadAudioBuffer("/audio", ctx),
  ]);
  expect(results).toEqual([buffer, buffer]);
  expect(decodeAudioData).toHaveBeenCalledTimes(1);
  expect(getAudioCacheBytes()).toBe(800);
  expect(evictAudioBuffer("/audio")).toBe(800);
  expect(getCachedAudioBuffer("/audio")).toBeUndefined();
  expect(await loadAudioBuffer("/audio", ctx)).toBe(buffer);
  expect(decodeAudioData).toHaveBeenCalledTimes(2);
});
it("does not cache a stale decode after replacement", async () => {
  let finish!: (value: AudioBuffer) => void;
  const ctx = {
    decodeAudioData: () =>
      new Promise<AudioBuffer>((resolve) => {
        finish = resolve;
      }),
  } as unknown as AudioContext;
  const pending = loadAudioBuffer("/audio", ctx);
  await vi.waitFor(() => expect(finish).toBeDefined());
  clearCachedAudioBuffer("/audio");
  finish(buffer);
  await pending;
  expect(getCachedAudioBuffer("/audio")).toBeUndefined();
});
