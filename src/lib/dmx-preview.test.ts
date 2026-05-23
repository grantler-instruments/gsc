import { describe, expect, it, beforeEach } from "vitest";
import {
  buildDmxPreviewFrames,
  isDmxPreviewableCue,
  listDmxPreviewCues,
} from "./dmx-preview";
import { getDmxChannelLevel, resetDmxOutputBuffers } from "./dmx";
import type { Cue } from "../types/cue";
import type { Fixture } from "../types/fixture";

function fixture(id: string): Fixture {
  return {
    id,
    name: id,
    universe: 1,
    startAddress: 1,
    channelCount: 2,
  };
}

function lightCue(id: string, values: number[]): Cue {
  return {
    id,
    number: "1",
    name: id,
    type: "dmx",
    dmx: {
      mode: "partial",
      fixtures: [{ fixtureId: "a", values }],
    },
  };
}

describe("dmx-preview", () => {
  beforeEach(() => {
    resetDmxOutputBuffers();
  });

  it("detects previewable light cues", () => {
    const fixtures = [fixture("a")];
    expect(isDmxPreviewableCue(lightCue("c1", [1, 2]), fixtures)).toBe(true);
    expect(
      isDmxPreviewableCue(
        { id: "c2", number: "2", name: "Fade", type: "lightFade" },
        fixtures,
      ),
    ).toBe(false);
  });

  it("applies preview cues in list order", () => {
    const fixtures = [fixture("a")];
    const cues = [lightCue("first", [10, 20]), lightCue("second", [100, 5])];

    buildDmxPreviewFrames(cues, ["first", "second"], fixtures);

    expect(getDmxChannelLevel(1, 1)).toBe(100);
    expect(getDmxChannelLevel(1, 2)).toBe(5);
  });

  it("lists preview cues in cue-list order", () => {
    const fixtures = [fixture("a")];
    const cues = [lightCue("b", [0, 0]), lightCue("a", [0, 0])];

    expect(listDmxPreviewCues(cues, ["a", "b"], fixtures).map((cue) => cue.id)).toEqual([
      "b",
      "a",
    ]);
  });
});
