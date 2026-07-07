import { beforeEach, describe, expect, it } from "vitest";
import type { Fixture } from "../types/fixture";
import {
  copyDmxLevelsFromCue,
  grabDmxLevelsFromOutput,
  resetDmxOutputBuffers,
  setDmxChannelLevel,
} from "./dmx";
import { applyHomeToAllMovingHeadsInCue } from "./fixture-home";

const movingHead: Fixture = {
  id: "spot",
  name: "Spot",
  universe: 1,
  startAddress: 1,
  channelCount: 4,
  ofl: {
    filePath: "/assets/fixtures/ofl/test/spot.json",
    manufacturerKey: "test",
    manufacturer: "Test",
    fixtureKey: "spot",
    model: "Spot",
    modeName: "std",
    categories: ["Moving Head"],
    channels: [
      { key: "Pan", kind: "pan", fineIndex: 1, angleRange: { start: 0, end: 540 } },
      { key: "Pan fine", kind: "pan", coarseIndex: 0 },
      { key: "Tilt", kind: "tilt", fineIndex: 3, angleRange: { start: 0, end: 270 } },
      { key: "Tilt fine", kind: "tilt", coarseIndex: 2 },
    ],
  },
};

const dimmer: Fixture = {
  id: "dim",
  name: "Dimmer",
  universe: 1,
  startAddress: 10,
  channelCount: 1,
};

describe("dmx cue workflow helpers", () => {
  beforeEach(() => {
    resetDmxOutputBuffers();
  });

  it("grabs current output levels into a cue", () => {
    setDmxChannelLevel(1, 10, 180);

    const next = grabDmxLevelsFromOutput(
      { mode: "partial", fixtures: [{ fixtureId: "dim", values: [0] }] },
      [dimmer, movingHead],
    );

    expect(next.fixtures).toHaveLength(1);
    expect(next.fixtures.find((entry) => entry.fixtureId === "dim")?.values[0]).toBe(180);
  });

  it("grabs all patched fixtures when cue is empty", () => {
    setDmxChannelLevel(1, 1, 64);
    setDmxChannelLevel(1, 10, 180);

    const next = grabDmxLevelsFromOutput({ mode: "partial", fixtures: [] }, [dimmer, movingHead]);

    expect(next.fixtures).toHaveLength(2);
    expect(next.fixtures.find((entry) => entry.fixtureId === "dim")?.values[0]).toBe(180);
  });

  it("copies fixture levels from another cue", () => {
    const target = { mode: "partial" as const, fixtures: [{ fixtureId: "dim", values: [0] }] };
    const source = {
      mode: "partial" as const,
      fixtures: [{ fixtureId: "dim", values: [220] }],
    };

    const next = copyDmxLevelsFromCue(target, source, [dimmer]);
    expect(next.fixtures[0]?.values[0]).toBe(220);
  });

  it("homes all moving heads in a cue", () => {
    const next = applyHomeToAllMovingHeadsInCue(
      {
        mode: "partial",
        fixtures: [{ fixtureId: "spot", values: [255, 255, 255, 255] }],
      },
      [movingHead],
    );

    const values = next.fixtures[0]?.values ?? [];
    expect(values[0]).toBeLessThan(255);
    expect(values[2]).toBe(0);
  });
});
