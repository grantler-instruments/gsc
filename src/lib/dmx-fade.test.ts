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

    expect(plan?.entries).toHaveLength(1);
    expect(plan?.entries[0]).toMatchObject({
      fixture: fixtures[0],
      fromValues: [100, 50],
      toValues: [200, 0],
    });
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

    expect(plan?.entries).toHaveLength(2);
    expect(plan?.entries[0]?.fromValues[0]).toBe(255);
    expect(plan?.entries[0]?.toValues).toEqual([0, 0]);
    expect(plan?.entries[1]?.fromValues).toEqual([128, 0, 0]);
    expect(plan?.entries[1]?.toValues).toEqual([0, 0, 0]);
  });

  it("samples a fade halfway between from and to", () => {
    setDmxChannelLevel(1, 1, 0);
    setDmxChannelLevel(1, 2, 0);

    const plan = buildDmxFadePlan(
      {
        mode: "partial",
        fixtures: [{ fixtureId: "f1", values: [200, 100] }],
      },
      fixtures,
    );
    expect(plan).not.toBeNull();
    if (!plan) throw new Error("Expected fade plan");

    const frames = sampleDmxFadePlan(plan, 0.5);
    expect(frames).toHaveLength(1);
    expect(getDmxChannelLevel(1, 1)).toBe(100);
    expect(getDmxChannelLevel(1, 2)).toBe(50);
  });
});
