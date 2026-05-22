import { describe, expect, it } from "vitest";
import {
  canOpacityFadeTarget,
  canVolumeFadeTarget,
  defaultFadeCueFields,
  fadeCueLabel,
  isFadeCue,
  isOpacityFadeCue,
  isValidFadeTarget,
  isVolumeFadeCue,
  resolveFadeFromLevel,
} from "./fade";
import { testCue } from "../test/fixtures/cues";

describe("isFadeCue", () => {
  it("detects volume and opacity fade cue types", () => {
    expect(isVolumeFadeCue(testCue("a", "A", "volumeFade"))).toBe(true);
    expect(isOpacityFadeCue(testCue("b", "B", "opacityFade"))).toBe(true);
    expect(isFadeCue(testCue("a", "A", "volumeFade"))).toBe(true);
    expect(isFadeCue(testCue("c", "C", "audio"))).toBe(false);
  });
});

describe("isValidFadeTarget", () => {
  it("accepts audio and video for volume fades", () => {
    expect(
      isValidFadeTarget("volumeFade", testCue("a", "A", "audio")),
    ).toBe(true);
    expect(
      isValidFadeTarget("volumeFade", testCue("v", "V", "video")),
    ).toBe(true);
    expect(
      isValidFadeTarget("volumeFade", testCue("i", "I", "image")),
    ).toBe(false);
  });

  it("accepts video and image for opacity fades", () => {
    expect(
      isValidFadeTarget("opacityFade", testCue("v", "V", "video")),
    ).toBe(true);
    expect(
      isValidFadeTarget("opacityFade", testCue("i", "I", "image")),
    ).toBe(true);
    expect(
      isValidFadeTarget("opacityFade", testCue("a", "A", "audio")),
    ).toBe(false);
  });

  it("rejects utility cues and missing targets", () => {
    expect(isValidFadeTarget("volumeFade", undefined)).toBe(false);
    expect(isValidFadeTarget("volumeFade", testCue("w", "Wait", "wait"))).toBe(
      false,
    );
    expect(
      isValidFadeTarget(
        "volumeFade",
        testCue("f", "Fade", "volumeFade", { fadeTargetId: "a" }),
      ),
    ).toBe(false);
  });
});

describe("canVolumeFadeTarget / canOpacityFadeTarget", () => {
  it("matches media types", () => {
    expect(canVolumeFadeTarget(testCue("a", "A", "audio"))).toBe(true);
    expect(canOpacityFadeTarget(testCue("i", "I", "image"))).toBe(true);
    expect(canVolumeFadeTarget(testCue("m", "M", "midi"))).toBe(false);
  });
});

describe("resolveFadeFromLevel", () => {
  it("reads volume or opacity from the target cue", () => {
    const audio = testCue("a", "A", "audio", { volume: 0.5 });
    const video = testCue("v", "V", "video", { opacity: 0.25 });
    expect(
      resolveFadeFromLevel(
        testCue("f", "Fade", "volumeFade", { fadeTargetId: "a" }),
        audio,
      ),
    ).toBe(0.5);
    expect(
      resolveFadeFromLevel(
        testCue("f", "Fade", "opacityFade", { fadeTargetId: "v" }),
        video,
      ),
    ).toBe(0.25);
  });

  it("clamps out-of-range values", () => {
    const audio = testCue("a", "A", "audio", { volume: 2 });
    expect(
      resolveFadeFromLevel(
        testCue("f", "Fade", "volumeFade", { fadeTargetId: "a" }),
        audio,
      ),
    ).toBe(1);
  });
});

describe("defaultFadeCueFields", () => {
  it("returns two-second fades to zero", () => {
    expect(defaultFadeCueFields("volumeFade")).toEqual({
      fadeDuration: 2,
      fadeTo: 0,
    });
    expect(defaultFadeCueFields("opacityFade")).toEqual({
      fadeDuration: 2,
      fadeTo: 0,
    });
  });
});

describe("fadeCueLabel", () => {
  it("labels fade types", () => {
    expect(fadeCueLabel("volumeFade")).toBe("Volume fade");
    expect(fadeCueLabel("opacityFade")).toBe("Opacity fade");
  });
});
