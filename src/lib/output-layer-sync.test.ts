import { describe, expect, it } from "vitest";
import type { OutputLayer, OutputState } from "../types/output";
import {
  isOutputStateFadeOnly,
  outputLayersEqual,
  outputLayersMediaEqual,
  outputStatesEqual,
} from "./output-layer-sync";

function testLayer(overrides: Partial<OutputLayer> = {}): OutputLayer {
  return {
    cueId: "cue-1",
    type: "video",
    assetPath: "/assets/video.mp4",
    objectUrl: "blob:control",
    opacity: 1,
    volume: 1,
    inTime: 0,
    sliceSec: 4,
    goAtMs: 1000,
    loop: true,
    loopCount: "inf",
    ...overrides,
  };
}

describe("output-layer-sync", () => {
  it("ignores objectUrl differences when comparing layers", () => {
    const left = [testLayer({ objectUrl: "blob:a" })];
    const right = [testLayer({ objectUrl: "blob:b" })];
    expect(outputLayersEqual(left, right)).toBe(true);
  });

  it("detects opacity and transport changes", () => {
    const base = [testLayer()];
    expect(outputLayersEqual(base, [testLayer({ opacity: 0.5 })])).toBe(false);
    expect(outputLayersEqual(base, [testLayer({ goAtMs: 2000 })])).toBe(false);
    expect(outputLayersMediaEqual(base, [testLayer({ opacity: 0.5 })])).toBe(true);
    expect(outputLayersMediaEqual(base, [testLayer({ goAtMs: 2000 })])).toBe(false);
  });

  it("compares output state by project and layer content", () => {
    const left: OutputState = {
      revision: 1,
      projectId: "p1",
      projectRootDir: null,
      activeCueIds: ["cue-1"],
      layers: [testLayer()],
    };
    const right: OutputState = {
      revision: 9,
      projectId: "p1",
      projectRootDir: null,
      activeCueIds: ["cue-1"],
      layers: [testLayer()],
    };
    const changed: OutputState = {
      revision: 2,
      projectId: "p1",
      projectRootDir: null,
      activeCueIds: ["cue-1"],
      layers: [testLayer({ opacity: 0.25 })],
    };

    expect(outputStatesEqual(left, right)).toBe(true);
    expect(outputStatesEqual(left, changed)).toBe(false);
    expect(isOutputStateFadeOnly(left, changed)).toBe(true);
  });
});
