import { describe, expect, it } from "vitest";
import type { Fixture } from "../types/fixture";
import { interpolateFixtureFadeValues } from "./dmx-fade-semantic";
import { detectFixturePositionAxes, writeFixturePositionDegrees } from "./fixture-position";

const rgbPar: Fixture = {
  id: "par",
  name: "RGB Par",
  universe: 1,
  startAddress: 1,
  channelCount: 4,
  ofl: {
    filePath: "/assets/fixtures/ofl/generic/rgb-par.json",
    manufacturerKey: "generic",
    manufacturer: "Generic",
    fixtureKey: "rgb-par",
    model: "RGB Par",
    modeName: "std",
    channels: [
      { key: "Red", kind: "red" },
      { key: "Green", kind: "green" },
      { key: "Blue", kind: "blue" },
      { key: "Dimmer", kind: "intensity" },
    ],
  },
};

const movingHead: Fixture = {
  id: "spot",
  name: "Spot",
  universe: 1,
  startAddress: 10,
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

const wheelFixture: Fixture = {
  id: "wheel",
  name: "Wheel",
  universe: 1,
  startAddress: 20,
  channelCount: 2,
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
          { dmxRange: [0, 9], kind: "colorWheel", label: "Open" },
          { dmxRange: [10, 19], kind: "colorWheel", label: "Red" },
          { dmxRange: [20, 29], kind: "colorWheel", label: "Blue" },
        ],
      },
      { key: "Dimmer", kind: "intensity" },
    ],
  },
};

describe("interpolateFixtureFadeValues", () => {
  it("fades rgb in color space instead of per-channel mud", () => {
    const from = [255, 0, 0, 255];
    const to = [0, 0, 255, 255];
    const mid = interpolateFixtureFadeValues(rgbPar, from, to, 0.5);

    expect(mid[0]).toBe(128);
    expect(mid[1]).toBe(0);
    expect(mid[2]).toBe(128);
    expect(mid[3]).toBe(255);
  });

  it("interpolates pan and tilt in degrees with 16-bit precision", () => {
    const from = [0, 0, 0, 0];
    const to = [255, 255, 255, 255];
    const mid = interpolateFixtureFadeValues(movingHead, from, to, 0.5);

    expect(mid[0]).toBeGreaterThan(120);
    expect(mid[0]).toBeLessThan(136);
    expect(mid[2]).toBeGreaterThan(120);
    expect(mid[2]).toBeLessThan(136);
  });

  it("snaps wheel channels at the midpoint instead of sweeping", () => {
    const from = [5, 100];
    const to = [25, 200];
    const early = interpolateFixtureFadeValues(wheelFixture, from, to, 0.25);
    const late = interpolateFixtureFadeValues(wheelFixture, from, to, 0.75);

    expect(early[0]).toBe(5);
    expect(late[0]).toBe(25);
    expect(early[1]).toBe(125);
    expect(late[1]).toBe(175);
  });

  it("falls back to linear interpolation for manual fixtures", () => {
    const manual: Fixture = {
      id: "manual",
      name: "Manual",
      universe: 1,
      startAddress: 30,
      channelCount: 2,
    };

    const mid = interpolateFixtureFadeValues(manual, [100, 50], [200, 150], 0.5);
    expect(mid).toEqual([150, 100]);
  });

  it("holds pan/tilt when fading color and intensity only", () => {
    const axes = detectFixturePositionAxes(movingHead, [
      { channelIndex: 0, fineChannelIndex: 1, label: "pan", kind: "pan", resolution: "16bit" },
      { channelIndex: 2, fineChannelIndex: 3, label: "tilt", kind: "tilt", resolution: "16bit" },
    ]);
    if (!axes) throw new Error("Expected axes");

    const from = [0, 0, 0, 0];
    const to = [0, 0, 0, 0];
    for (const update of writeFixturePositionDegrees(axes, { pan: 100, tilt: 50 })) {
      from[update.channelIndex] = update.value;
    }
    for (const update of writeFixturePositionDegrees(axes, { pan: 400, tilt: 200 })) {
      to[update.channelIndex] = update.value;
    }

    const mid = interpolateFixtureFadeValues(movingHead, from, to, 0.5, "colorIntensity");
    expect(mid).toEqual(from);
  });

  it("still fades intensity in color-only scope", () => {
    const mid = interpolateFixtureFadeValues(
      wheelFixture,
      [5, 100],
      [25, 200],
      0.5,
      "colorIntensity",
    );
    expect(mid[0]).toBe(5);
    expect(mid[1]).toBe(150);
  });
});
