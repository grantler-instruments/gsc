import { describe, expect, it } from "vitest";
import type { Fixture } from "../types/fixture";
import {
  combineCoarseFineDmx,
  findPresetForValue,
  groupFixtureInspectorChannels,
  splitCoarseFineDmx,
} from "./fixture-inspector-groups";

function fixture(overrides: Partial<Fixture> & Pick<Fixture, "id">): Fixture {
  return {
    name: overrides.name ?? overrides.id,
    universe: 1,
    startAddress: 1,
    channelCount: overrides.channelCount ?? 1,
    ...overrides,
  };
}

describe("fixture-inspector-groups", () => {
  it("groups rgb and intensity channels separately", () => {
    const f = fixture({
      id: "rgb",
      channelCount: 4,
      ofl: {
        filePath: "/assets/fixtures/ofl/generic/rgb.json",
        manufacturerKey: "generic",
        manufacturer: "Generic",
        fixtureKey: "rgb",
        model: "RGB",
        modeName: "4ch",
        channels: [
          { key: "Red", kind: "red" },
          { key: "Green", kind: "green" },
          { key: "Blue", kind: "blue" },
          { key: "Dimmer", kind: "intensity" },
        ],
      },
    });

    const groups = groupFixtureInspectorChannels(f);
    expect(groups.map((group) => group.id)).toEqual(["intensity", "color"]);
    expect(groups.find((group) => group.id === "color")?.channels.map((row) => row.kind)).toEqual([
      "red",
      "green",
      "blue",
    ]);
  });

  it("combines coarse and fine pan into one row", () => {
    const f = fixture({
      id: "spot",
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
          { key: "Pan", kind: "pan", fineIndex: 1 },
          { key: "Pan fine", kind: "pan", coarseIndex: 0 },
          { key: "Tilt", kind: "tilt", fineIndex: 3 },
          { key: "Tilt fine", kind: "tilt", coarseIndex: 2 },
        ],
      },
    });

    const position = groupFixtureInspectorChannels(f).find((group) => group.id === "position");
    expect(position?.channels).toHaveLength(2);
    expect(position?.channels[0]).toMatchObject({
      channelIndex: 0,
      fineChannelIndex: 1,
      resolution: "16bit",
    });
  });

  it("builds wheel presets from capabilities", () => {
    const f = fixture({
      id: "wheel",
      channelCount: 1,
      ofl: {
        filePath: "/assets/fixtures/ofl/test/wheel.json",
        manufacturerKey: "test",
        manufacturer: "Test",
        fixtureKey: "wheel",
        model: "Wheel",
        modeName: "std",
        channels: [
          {
            key: "Color Wheel",
            kind: "colorWheel",
            capabilities: [
              { dmxRange: [0, 0], kind: "colorWheel", label: "Open" },
              { dmxRange: [10, 10], kind: "colorWheel", label: "Red", colors: ["#ff0000"] },
            ],
          },
        ],
      },
    });

    const wheels = groupFixtureInspectorChannels(f).find((group) => group.id === "wheels");
    expect(wheels?.channels[0]?.presets).toEqual([
      { label: "Open", dmxValue: 0, dmxRange: [0, 0] },
      { label: "Red", dmxValue: 10, dmxRange: [10, 10] },
    ]);
  });

  it("splits and combines 16-bit dmx values", () => {
    expect(combineCoarseFineDmx(1, 255)).toBe(511);
    expect(splitCoarseFineDmx(511)).toEqual({ coarse: 1, fine: 255 });
  });

  it("finds preset matching a dmx value", () => {
    const presets = [
      { label: "Open", dmxValue: 0, dmxRange: [0, 9] as [number, number] },
      { label: "Red", dmxValue: 10, dmxRange: [10, 20] as [number, number] },
    ];
    expect(findPresetForValue(15, presets)?.label).toBe("Red");
    expect(findPresetForValue(200, presets)).toBeUndefined();
  });
});
