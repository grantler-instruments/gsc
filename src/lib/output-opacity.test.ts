import { afterEach, describe, expect, it, vi } from "vitest";
import type { OutputLayer } from "../types/output";
import {
  applyOutputLayerOpacities,
  isOutputLayerFadeAnimating,
  outputLayerOpacityAt,
} from "./output-opacity";

function layer(patch: Partial<OutputLayer> = {}): OutputLayer {
  return {
    cueId: "v",
    type: "video",
    assetPath: "clip.mp4",
    objectUrl: "blob:clip",
    opacity: 0.8,
    volume: 1,
    inTime: 0,
    sliceSec: 10,
    goAtMs: 0,
    loop: false,
    loopCount: 1,
    ...patch,
  };
}

const fade = { fadeInSec: 2, fadeOutSec: 4, curve: "linear" as const };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("outputLayerOpacityAt", () => {
  it("returns the plain opacity without a fade", () => {
    expect(outputLayerOpacityAt(layer(), 0)).toBe(0.8);
  });

  it("scales opacity by the fade in", () => {
    expect(outputLayerOpacityAt(layer({ fade }), 0)).toBe(0);
    expect(outputLayerOpacityAt(layer({ fade }), 1_000)).toBeCloseTo(0.4);
    expect(outputLayerOpacityAt(layer({ fade }), 5_000)).toBeCloseTo(0.8);
  });

  it("needs the media duration for the end fade of a video without an Out point", () => {
    expect(outputLayerOpacityAt(layer({ fade }), 8_000)).toBeCloseTo(0.8);
    expect(outputLayerOpacityAt(layer({ fade }), 8_000, 10)).toBeCloseTo(0.4);
  });

  it("uses the Out point when one is set", () => {
    const withOut = layer({ fade, inTime: 2, outTime: 12, sliceSec: 10 });
    expect(outputLayerOpacityAt(withOut, 8_000)).toBeCloseTo(0.4);
    // Media shorter than the Out point ends the slice early.
    expect(outputLayerOpacityAt(withOut, 4_000, 8)).toBeCloseTo(0.4);
  });

  it("fades the last pass of a finite loop and never the end of an infinite one", () => {
    const looped = layer({ fade, outTime: 10, loop: true, loopCount: 2 });
    expect(outputLayerOpacityAt(looped, 8_000)).toBeCloseTo(0.8);
    expect(outputLayerOpacityAt(looped, 18_000)).toBeCloseTo(0.4);
    const forever = layer({ fade, outTime: 10, loop: true, loopCount: "inf" });
    expect(outputLayerOpacityAt(forever, 18_000)).toBeCloseTo(0.8);
  });

  it("only fades the end of an image that has a duration", () => {
    const held = layer({ type: "image", fade, sliceSec: 1 });
    expect(outputLayerOpacityAt(held, 60_000)).toBeCloseTo(0.8);
    const timed = layer({ type: "image", fade, outTime: 10, sliceSec: 10 });
    expect(outputLayerOpacityAt(timed, 8_000)).toBeCloseTo(0.4);
  });

  it("applies a release on stop", () => {
    const released = layer({
      fade: { ...fade, release: { startedAtMs: 5_000, durationSec: 2 } },
    });
    expect(outputLayerOpacityAt(released, 6_000)).toBeCloseTo(0.4);
    expect(outputLayerOpacityAt(released, 7_000)).toBe(0);
  });
});

describe("isOutputLayerFadeAnimating", () => {
  it("tracks whether the envelope still moves", () => {
    expect(isOutputLayerFadeAnimating(layer(), 0)).toBe(false);
    expect(isOutputLayerFadeAnimating(layer({ fade }), 1_000)).toBe(true);
    expect(isOutputLayerFadeAnimating(layer({ fade }), 3_000, 10)).toBe(false);
    expect(isOutputLayerFadeAnimating(layer({ fade }), 7_000, 10)).toBe(true);
  });
});

describe("applyOutputLayerOpacities", () => {
  it("writes the faded opacity onto each layer node, reading duration from its video", () => {
    const node = { style: { opacity: "" }, querySelector: () => ({ duration: 10 }) };
    const querySelector = vi.fn(() => node);
    vi.stubGlobal("document", { querySelector });
    applyOutputLayerOpacities([layer({ fade })], 8_000);
    expect(querySelector).toHaveBeenCalledWith('[data-gsc-output-layer="v"]');
    expect(Number(node.style.opacity)).toBeCloseTo(0.4);
  });

  it("skips layers that are not mounted", () => {
    vi.stubGlobal("document", { querySelector: () => null });
    expect(() => applyOutputLayerOpacities([layer({ fade })], 0)).not.toThrow();
  });
});
