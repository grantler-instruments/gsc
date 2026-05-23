import { beforeEach, describe, expect, it } from "vitest";
import { testCue } from "../test/fixtures/cues";
import { estimateCueDurationMs, estimateStepDurationMs } from "./cue-duration";
import { INFINITE_LOOP_ESTIMATE_SEC } from "./loop";
import { clearMediaDuration, setMediaDurationSec } from "./media-duration";

describe("estimateCueDurationMs", () => {
  beforeEach(() => {
    clearMediaDuration("assets/a.wav");
  });

  it("uses wait duration for wait cues", () => {
    const cue = testCue("w", "Wait", "wait", { waitDurationSec: 2 });
    expect(estimateCueDurationMs(cue, [cue])).toBe(2000);
  });

  it("uses fade duration for fade cues", () => {
    const cue = testCue("fade", "Fade", "volumeFade", {
      fadeTargetId: "a",
      fadeDuration: 3,
    });
    expect(estimateCueDurationMs(cue, [cue])).toBe(3000);
  });

  it("estimates audio from slice plus fade padding", () => {
    setMediaDurationSec("assets/a.wav", 30);
    const cue = testCue("a", "A", "audio", {
      assetPath: "assets/a.wav",
      inTime: 5,
      outTime: 15,
      fadeIn: 1,
      fadeOut: 0.5,
    });
    expect(estimateCueDurationMs(cue, [cue])).toBe(11500);
  });

  it("uses infinite estimate for looping audio", () => {
    const cue = testCue("a", "A", "audio", {
      assetPath: "assets/a.wav",
      loop: true,
    });
    expect(estimateCueDurationMs(cue, [cue])).toBe(INFINITE_LOOP_ESTIMATE_SEC * 1000);
  });

  it("uses infinite estimate for image without duration", () => {
    const cue = testCue("i", "I", "image");
    expect(estimateCueDurationMs(cue, [cue])).toBe(INFINITE_LOOP_ESTIMATE_SEC * 1000);
  });

  it("sums sequential steps for a sequence container", () => {
    const cues = [
      testCue("seq", "Seq", "sequence"),
      testCue("w", "Wait", "wait", { parentId: "seq", waitDurationSec: 1 }),
      testCue("fade", "Fade", "volumeFade", {
        parentId: "seq",
        fadeTargetId: "a",
        fadeDuration: 2,
      }),
    ];
    expect(estimateCueDurationMs(cues[0], cues)).toBe(3000);
  });

  it("uses the longest leaf playback child in a parallel group", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("a", "A", "audio", { parentId: "par", outTime: 3 }),
      testCue("b", "B", "audio", { parentId: "par", outTime: 5 }),
      testCue("fade", "Fade", "volumeFade", {
        parentId: "par",
        fadeTargetId: "a",
        fadeDuration: 10,
      }),
    ];
    expect(estimateCueDurationMs(cues[0], cues)).toBe(5000);
  });
});

describe("estimateStepDurationMs", () => {
  it("returns zero for an empty step", () => {
    expect(estimateStepDurationMs([], [])).toBe(0);
  });

  it("returns the maximum child duration in a parallel step", () => {
    const cues = [
      testCue("w", "Wait", "wait", { waitDurationSec: 1 }),
      testCue("fade", "Fade", "volumeFade", {
        fadeTargetId: "a",
        fadeDuration: 2.5,
      }),
      testCue("a", "A", "audio"),
    ];
    expect(estimateStepDurationMs(["w", "fade"], cues)).toBe(2500);
  });

  it("enforces a minimum step duration", () => {
    const cue = testCue("m", "M", "midi");
    expect(estimateStepDurationMs(["m"], [cue])).toBe(150);
  });
});
