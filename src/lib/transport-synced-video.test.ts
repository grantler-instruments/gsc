import { describe, expect, it, vi } from "vitest";
import type { OutputLayer } from "../types/output";
import {
  createTransportVideoSyncState,
  seekTransportVideoToClock,
  type TransportVideoTiming,
  transportTimingFromOutputLayer,
} from "./transport-synced-video";
import { driftSecWithinSlice } from "./video-playback";

describe("driftSecWithinSlice", () => {
  it("treats slice positions as circular", () => {
    expect(driftSecWithinSlice(3.9, 0.1, 4, 0)).toBeCloseTo(0.2, 5);
  });
});

describe("transportTimingFromOutputLayer", () => {
  it("derives looping target time from goAtMs", () => {
    const layer: OutputLayer = {
      cueId: "c1",
      type: "video",
      assetPath: "a.mp4",
      objectUrl: "blob:a",
      opacity: 1,
      volume: 1,
      inTime: 0,
      sliceSec: 4,
      loop: true,
      loopCount: "inf",
      goAtMs: 1000,
    };

    const timing = transportTimingFromOutputLayer(layer);
    expect(timing.targetTime(6000)).toBeCloseTo(1, 5);
    expect(timing.isLooping()).toBe(true);
  });
});

describe("seekTransportVideoToClock", () => {
  it("calls onEnded when a finite loop completes on the transport clock", () => {
    const onEnded = vi.fn();
    const timing: TransportVideoTiming = {
      inTime: 0,
      sliceSec: 4,
      loopCount: 2,
      goAtMs: 0,
      targetTime: () => 0,
      isLooping: () => true,
      isPlaybackComplete: () => true,
    };
    const video = {
      readyState: 1,
      duration: 10,
      pause: vi.fn(),
    } as unknown as HTMLVideoElement;
    const state = createTransportVideoSyncState();

    expect(seekTransportVideoToClock(video, timing, { onEnded }, state)).toBe(false);
    expect(onEnded).toHaveBeenCalledOnce();
    expect(seekTransportVideoToClock(video, timing, { onEnded }, state)).toBe(false);
    expect(onEnded).toHaveBeenCalledOnce();
  });
});
