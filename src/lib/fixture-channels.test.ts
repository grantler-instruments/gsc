import { describe, expect, it } from "vitest";
import type { Fixture } from "../types/fixture";
import {
  getDmxChannelLevel,
  resetDmxOutputBuffers,
  updateDmxFixtureLogicalChannelValue,
} from "./dmx";
import { buildDmxFadePlan, sampleDmxFadePlan } from "./dmx-fade";
import {
  applyOflChannelResolutions,
  combine16BitValue,
  getDmxFixtureLogicalChannelValue,
  iterateFixtureLogicalChannels,
  repairFixtureChannelPairs,
  split16BitValue,
} from "./fixture-channels";
import { setManualFixtureChannel16Bit } from "./fixtures";

function fixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: "f1",
    name: "Moving head",
    universe: 1,
    startAddress: 1,
    channelCount: 3,
    channels: [{ name: "Dimmer" }, { name: "Pan", resolution: "16bit" }, { resolution: "fine" }],
    ...overrides,
  };
}

describe("fixture-channels", () => {
  it("detects OFL fine channel pairs", () => {
    expect(
      applyOflChannelResolutions([
        { key: "Pan" },
        { key: "Pan fine" },
        { key: "Tilt" },
        { key: "Tilt fine" },
      ]),
    ).toEqual([
      { key: "Pan", resolution: "16bit" },
      { key: "Pan fine", resolution: "fine" },
      { key: "Tilt", resolution: "16bit" },
      { key: "Tilt fine", resolution: "fine" },
    ]);
  });

  it("repairs manual 16-bit channel pairs", () => {
    expect(repairFixtureChannelPairs([{ name: "Pan", resolution: "16bit" }])).toEqual([
      { name: "Pan", resolution: "16bit" },
      { resolution: "fine" },
    ]);
  });

  it("splits and combines 16-bit values", () => {
    expect(split16BitValue(40000)).toEqual({ coarse: 156, fine: 64 });
    expect(combine16BitValue(156, 64)).toBe(40000);
  });

  it("iterates logical channels without fine slots", () => {
    expect(iterateFixtureLogicalChannels(fixture())).toEqual([
      { slotIndex: 0, is16Bit: false, name: "Dimmer" },
      { slotIndex: 1, is16Bit: true, name: "Pan" },
    ]);
  });

  it("reads and writes combined cue values", () => {
    const f = fixture();
    const values = [255, 156, 64];
    expect(getDmxFixtureLogicalChannelValue(values, f, 1)).toBe(40000);

    const data = updateDmxFixtureLogicalChannelValue(
      { mode: "partial", fixtures: [{ fixtureId: "f1", values: [0, 0, 0] }] },
      "f1",
      1,
      40000,
      f,
    );
    expect(data.fixtures[0]?.values).toEqual([0, 156, 64]);
  });

  it("toggles manual 16-bit channels", () => {
    const base = fixture({
      channelCount: 1,
      channels: [{ name: "Pan" }],
    });
    expect(setManualFixtureChannel16Bit(base, 0, true)).toEqual([
      { name: "Pan", resolution: "16bit" },
      { resolution: "fine" },
    ]);
  });

  it("fades 16-bit channels as a single combined value", () => {
    resetDmxOutputBuffers();
    const fixtures = [fixture()];
    const plan = buildDmxFadePlan(
      {
        mode: "partial",
        fixtures: [{ fixtureId: "f1", values: [0, 156, 64] }],
      },
      fixtures,
    );

    expect(plan?.channels).toHaveLength(2);
    expect(plan?.channels[1]).toMatchObject({
      index: 1,
      from: 0,
      to: 40000,
      resolution: "16bit",
    });

    expect(plan).not.toBeNull();
    if (!plan) throw new Error("Expected fade plan");

    sampleDmxFadePlan(plan, 1);
    expect(getDmxChannelLevel(1, 2)).toBe(156);
    expect(getDmxChannelLevel(1, 3)).toBe(64);
  });
});
