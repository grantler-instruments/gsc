import { describe, expect, it } from "vitest";
import { testCue } from "../test/fixtures/cues";
import {
  computePlaybackProgress,
  computePlaybackProgressWithBounds,
  createPlaybackBounds,
  cueNeedsKnownDuration,
  cueShowsPlaybackProgress,
  getPlaybackSliceSec,
  isFinitePlaybackComplete,
  isImageInfiniteHold,
} from "./playback-slice";

describe("getPlaybackSliceSec", () => {
  it("uses in/out range for audio", () => {
    const cue = testCue("a", "A", "audio", { inTime: 10, outTime: 25 });
    expect(getPlaybackSliceSec(cue)).toBe(15);
  });

  it("uses source duration minus in point when out is unset", () => {
    const cue = testCue("a", "A", "audio", { inTime: 5 });
    expect(getPlaybackSliceSec(cue, 60)).toBe(55);
  });

  it("returns fixed defaults for midi and osc", () => {
    expect(getPlaybackSliceSec(testCue("m", "M", "midi"))).toBe(0.15);
    expect(getPlaybackSliceSec(testCue("o", "O", "osc"))).toBe(0.15);
  });

  it("treats image without out time as a one-second placeholder slice", () => {
    const cue = testCue("i", "I", "image");
    expect(getPlaybackSliceSec(cue)).toBe(1);
    expect(isImageInfiniteHold(cue)).toBe(true);
  });
});

describe("createPlaybackBounds", () => {
  it("builds wait cue bounds from wait duration", () => {
    const cue = testCue("w", "Wait", "wait", { waitDurationSec: 2.5 });
    expect(createPlaybackBounds(cue)).toEqual({
      sliceSec: 2.5,
      endSec: 2.5,
      inTime: 0,
      loopCount: 1,
      looping: false,
    });
  });

  it("marks infinite image hold cues", () => {
    const cue = testCue("i", "I", "image");
    expect(createPlaybackBounds(cue)).toMatchObject({
      imageHoldInfinite: true,
      loopCount: 1,
      looping: false,
    });
  });

  it("detects infinite audio loops", () => {
    const cue = testCue("a", "A", "audio", {
      assetPath: "a.wav",
      loop: true,
    });
    expect(createPlaybackBounds(cue, 10)).toMatchObject({
      sliceSec: 10,
      endSec: 10,
      loopCount: "inf",
      looping: true,
    });
  });
});

describe("computePlaybackProgressWithBounds", () => {
  const bounds = {
    sliceSec: 10,
    endSec: 10,
    inTime: 0,
    loopCount: 1 as const,
    looping: false,
  };

  it("computes progress through a finite run", () => {
    expect(computePlaybackProgressWithBounds(bounds, 5)).toMatchObject({
      progress: 0.5,
      positionSec: 5,
      looping: false,
    });
    expect(computePlaybackProgressWithBounds(bounds, 10).progress).toBe(1);
  });

  it("wraps progress for infinite loops", () => {
    const looping = { ...bounds, loopCount: "inf" as const, looping: true };
    const mid = computePlaybackProgressWithBounds(looping, 15);
    expect(mid.progress).toBeCloseTo(0.5);
    expect(mid.loopTotal).toBe("inf");
    expect(mid.loopIteration).toBe(2);
  });

  it("tracks loop iterations for finite multi-play runs", () => {
    const twice = { ...bounds, loopCount: 2, looping: false };
    const secondPass = computePlaybackProgressWithBounds(twice, 15);
    expect(secondPass.loopIteration).toBe(2);
    expect(secondPass.loopTotal).toBe(2);
  });
});

describe("isFinitePlaybackComplete", () => {
  it("completes when elapsed reaches total run time", () => {
    const bounds = createPlaybackBounds(testCue("a", "A", "audio", { outTime: 5 }));
    expect(isFinitePlaybackComplete(bounds, 4.9)).toBe(false);
    expect(isFinitePlaybackComplete(bounds, 5)).toBe(true);
  });

  it("never completes for infinite hold or loop", () => {
    const image = createPlaybackBounds(testCue("i", "I", "image"));
    const looping = createPlaybackBounds(testCue("a", "A", "audio", { loop: true }));
    expect(isFinitePlaybackComplete(image, 999)).toBe(false);
    expect(isFinitePlaybackComplete(looping, 999)).toBe(false);
  });
});

describe("computePlaybackProgress", () => {
  it("integrates bounds and elapsed time for a trimmed audio cue", () => {
    const cue = testCue("a", "A", "audio", { inTime: 2, outTime: 12 });
    const snapshot = computePlaybackProgress(cue, 5);
    expect(snapshot.progress).toBe(0.5);
    expect(snapshot.positionSec).toBe(7);
  });
});

describe("cueShowsPlaybackProgress", () => {
  it("shows progress for media and wait cues", () => {
    expect(cueShowsPlaybackProgress(testCue("a", "A", "audio"))).toBe(true);
    expect(cueShowsPlaybackProgress(testCue("w", "Wait", "wait"))).toBe(true);
  });

  it("hides progress for infinite image hold and light cues", () => {
    expect(cueShowsPlaybackProgress(testCue("i", "I", "image"))).toBe(false);
    expect(cueShowsPlaybackProgress(testCue("l", "Look", "dmx"))).toBe(false);
  });
});

describe("cueNeedsKnownDuration", () => {
  it("requires duration for audio/video with assets", () => {
    expect(cueNeedsKnownDuration(testCue("a", "A", "audio", { assetPath: "a.wav" }))).toBe(true);
    expect(cueNeedsKnownDuration(testCue("a", "A", "audio"))).toBe(false);
    expect(cueNeedsKnownDuration(testCue("i", "I", "image"))).toBe(false);
  });
});
