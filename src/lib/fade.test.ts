import { describe, expect, it } from "vitest";
import {
  canLightFadeTarget,
  canOpacityFadeTarget,
  canVolumeFadeTarget,
  defaultFadeCueFields,
  fadeCueLabel,
  isFadeCue,
  isLightFadeCue,
  isOpacityFadeCue,
  isValidFadeTarget,
  isVolumeFadeCue,
  isLightFadeReady,
  resolveFadeFromLevel,
  resolveLightFadeEndDmx,
} from "./fade";
import { testCue } from "../test/fixtures/cues";

describe("isFadeCue", () => {
  it("detects volume, opacity, and light fade cue types", () => {
    expect(isVolumeFadeCue(testCue("a", "A", "volumeFade"))).toBe(true);
    expect(isOpacityFadeCue(testCue("b", "B", "opacityFade"))).toBe(true);
    expect(isLightFadeCue(testCue("c", "C", "lightFade"))).toBe(true);
    expect(isFadeCue(testCue("a", "A", "volumeFade"))).toBe(true);
    expect(isFadeCue(testCue("c", "C", "lightFade"))).toBe(true);
    expect(isFadeCue(testCue("d", "D", "audio"))).toBe(false);
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

  it("accepts light cues for light fades", () => {
    expect(
      isValidFadeTarget(
        "lightFade",
        testCue("l", "Look", "dmx", {
          dmx: { mode: "snapshot", fixtures: [] },
        }),
      ),
    ).toBe(true);
    expect(
      isValidFadeTarget("lightFade", testCue("a", "A", "audio")),
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
    expect(canLightFadeTarget(testCue("l", "L", "dmx", { dmx: { mode: "partial", fixtures: [] } }))).toBe(true);
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
    expect(defaultFadeCueFields("lightFade")).toEqual({
      fadeDuration: 2,
    });
  });
});

describe("isLightFadeReady", () => {
  it("requires fixtures and channel data", () => {
    const fade = testCue("f", "Fade", "lightFade", {
      dmx: { mode: "partial", fixtures: [] },
    });
    expect(isLightFadeReady(fade, [])).toBe(false);
    expect(
      isLightFadeReady(
        testCue("f", "Fade", "lightFade", {
          dmx: {
            mode: "partial",
            fixtures: [{ fixtureId: "f1", values: [128] }],
          },
        }),
        [
          {
            id: "f1",
            name: "Dimmer",
            universe: 1,
            startAddress: 1,
            channelCount: 1,
          },
        ],
      ),
    ).toBe(true);
  });

  it("uses referenced light cue fixtures when fade dmx is sparse", () => {
    const fixtures = [
      {
        id: "f1",
        name: "Dimmer",
        universe: 1,
        startAddress: 1,
        channelCount: 1,
      },
    ];
    const cues = [
      testCue("l", "Look", "dmx", {
        dmx: { mode: "partial", fixtures: [{ fixtureId: "f1", values: [64] }] },
      }),
      testCue("f", "Fade", "lightFade", {
        fadeTargetId: "l",
        dmx: { mode: "partial", fixtures: [] },
      }),
    ];
    expect(
      resolveLightFadeEndDmx(cues[1], cues, fixtures)?.fixtures,
    ).toEqual([{ fixtureId: "f1", values: [64] }]);
    expect(isLightFadeReady(cues[1], fixtures, cues)).toBe(true);
  });
});

describe("fadeCueLabel", () => {
  it("labels fade types", () => {
    expect(fadeCueLabel("volumeFade")).toBe("Volume fade");
    expect(fadeCueLabel("opacityFade")).toBe("Opacity fade");
    expect(fadeCueLabel("lightFade")).toBe("Light fade");
  });
});
