import { beforeEach, describe, expect, it } from "vitest";
import type { Fixture } from "../types/fixture";
import { getDmxChannelLevel, resetDmxOutputBuffers, setDmxChannelLevel } from "./dmx";
import { buildDmxFadePlan, sampleDmxFadePlan } from "./dmx-fade";

const fixtures: Fixture[] = [
  {
    id: "f1",
    name: "Dimmer",
    universe: 1,
    startAddress: 1,
    channelCount: 2,
  },
  {
    id: "f2",
    name: "Par",
    universe: 1,
    startAddress: 10,
    channelCount: 3,
  },
];

describe("dmx fade", () => {
  beforeEach(() => {
    resetDmxOutputBuffers();
  });

  it("builds a partial fade plan from current output to cue values", () => {
    setDmxChannelLevel(1, 1, 100);
    setDmxChannelLevel(1, 2, 50);

    const plan = buildDmxFadePlan(
      {
        mode: "partial",
        fixtures: [{ fixtureId: "f1", values: [200, 0] }],
      },
      fixtures,
    );

    expect(plan?.channels).toEqual([
      { universe: 1, index: 0, from: 100, to: 200 },
      { universe: 1, index: 1, from: 50, to: 0 },
    ]);
  });

  it("builds a snapshot fade plan across the full rig", () => {
    setDmxChannelLevel(1, 1, 255);
    setDmxChannelLevel(1, 10, 128);

    const plan = buildDmxFadePlan(
      {
        mode: "snapshot",
        fixtures: [{ fixtureId: "f1", values: [0, 0] }],
      },
      fixtures,
    );

    expect(plan?.channels).toHaveLength(5);
    expect(plan?.channels[0]).toMatchObject({ index: 0, from: 255, to: 0 });
    expect(plan?.channels[4]).toMatchObject({ index: 11, from: 0, to: 0 });
  });

  it("samples a fade halfway between from and to", () => {
    const plan = buildDmxFadePlan(
      {
        mode: "partial",
        fixtures: [{ fixtureId: "f1", values: [200, 100] }],
      },
      fixtures,
    );
    expect(plan).not.toBeNull();

    const frames = sampleDmxFadePlan(plan!, 0.5);
    expect(frames).toHaveLength(1);
    expect(getDmxChannelLevel(1, 1)).toBe(100);
    expect(getDmxChannelLevel(1, 2)).toBe(50);
  });
});
