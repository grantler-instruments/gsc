import { describe, expect, it } from "vitest";
import { testCue } from "../test/fixtures/cues";
import { clampSeekPositionSec, goAtMsForSeekPosition } from "./playback-seek";

describe("clampSeekPositionSec", () => {
  it("clamps to the cue in/out slice", () => {
    const cue = testCue("a", "A", "audio", { inTime: 10, outTime: 30 });
    expect(clampSeekPositionSec(cue, 5)).toBe(10);
    expect(clampSeekPositionSec(cue, 20)).toBe(20);
    expect(clampSeekPositionSec(cue, 40)).toBe(30);
  });

  it("uses source duration when out is unset", () => {
    const cue = testCue("a", "A", "audio", { inTime: 2 });
    expect(clampSeekPositionSec(cue, 99, 60)).toBe(60);
  });
});

describe("goAtMsForSeekPosition", () => {
  it("backs up wall-clock time by the in-slice offset", () => {
    const cue = testCue("a", "A", "audio", { inTime: 10, outTime: 30 });
    const now = 1_000_000;
    expect(goAtMsForSeekPosition(cue, 20, undefined, now)).toBe(now - 10_000);
  });
});
