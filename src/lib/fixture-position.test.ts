import { describe, expect, it } from "vitest";
import type { Fixture } from "../types/fixture";
import type { FixtureInspectorChannel } from "./fixture-inspector-groups";
import {
  degreesToDmx,
  detectFixturePositionAxes,
  dmxToDegrees,
  fixtureBeamDirectionRadians,
  fixtureBeamReach,
  fixtureCenterPosition,
  readFixturePositionDegrees,
  resolveFixtureHomePosition,
  writeFixturePositionDegrees,
} from "./fixture-position";

function channel(
  channelIndex: number,
  kind: FixtureInspectorChannel["kind"],
  fineChannelIndex?: number,
): FixtureInspectorChannel {
  return {
    channelIndex,
    fineChannelIndex,
    label: kind,
    kind,
    resolution: fineChannelIndex !== undefined ? "16bit" : "8bit",
  };
}

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

describe("fixture-position", () => {
  it("detects pan and tilt axes", () => {
    const axes = detectFixturePositionAxes(movingHead, [
      channel(0, "pan", 1),
      channel(2, "tilt", 3),
      channel(4, "panTiltSpeed"),
    ]);
    expect(axes?.pan.channelIndex).toBe(0);
    expect(axes?.tilt.fineChannelIndex).toBe(3);
    expect(axes?.pan.angleRange).toEqual({ start: 0, end: 540 });
  });

  it("converts degrees to dmx and back", () => {
    const axes = detectFixturePositionAxes(movingHead, [
      channel(0, "pan", 1),
      channel(2, "tilt", 3),
    ]);
    if (!axes) throw new Error("Expected axes");

    expect(dmxToDegrees(0, axes.pan.angleRange)).toBe(0);
    expect(dmxToDegrees(65535, axes.pan.angleRange)).toBe(540);
    expect(degreesToDmx(270, axes.pan.angleRange)).toBe(Math.round(65535 / 2));
  });

  it("writes combined pan/tilt dmx values", () => {
    const axes = detectFixturePositionAxes(movingHead, [
      channel(0, "pan", 1),
      channel(2, "tilt", 3),
    ]);
    if (!axes) throw new Error("Expected axes");

    const updates = writeFixturePositionDegrees(axes, { pan: 270, tilt: 135 });
    const values = [0, 0, 0, 0];
    for (const update of updates) {
      values[update.channelIndex] = update.value;
    }

    expect(readFixturePositionDegrees(axes, values).pan).toBeCloseTo(270, 0);
    expect(readFixturePositionDegrees(axes, values).tilt).toBeCloseTo(135, 0);
  });

  it("uses factory center when home is unset", () => {
    const axes = detectFixturePositionAxes(movingHead, [
      channel(0, "pan", 1),
      channel(2, "tilt", 3),
    ]);
    if (!axes) throw new Error("Expected axes");
    expect(fixtureCenterPosition(axes)).toEqual({ pan: 270, tilt: 0 });
    expect(resolveFixtureHomePosition(movingHead, axes)).toEqual({ pan: 270, tilt: 0 });
  });

  it("uses saved home position when set", () => {
    const axes = detectFixturePositionAxes(movingHead, [
      channel(0, "pan", 1),
      channel(2, "tilt", 3),
    ]);
    if (!axes) throw new Error("Expected axes");
    const withHome: Fixture = {
      ...movingHead,
      homePanTilt: { pan: 100, tilt: 45 },
    };
    expect(resolveFixtureHomePosition(withHome, axes)).toEqual({ pan: 100, tilt: 45 });
  });

  it("derives beam direction and reach from tilt", () => {
    const axes = detectFixturePositionAxes(movingHead, [
      channel(0, "pan", 1),
      channel(2, "tilt", 3),
    ]);
    if (!axes) throw new Error("Expected axes");

    const centerValues = [0, 0, 0, 0];
    for (const update of writeFixturePositionDegrees(axes, { pan: 270, tilt: 0 })) {
      centerValues[update.channelIndex] = update.value;
    }
    const center = readFixturePositionDegrees(axes, centerValues);
    expect(fixtureBeamDirectionRadians(axes, center)).toBeCloseTo(0, 2);
    expect(fixtureBeamReach({ pan: 270, tilt: 0 })).toBeCloseTo(1, 5);
    expect(fixtureBeamReach({ pan: 270, tilt: 90 })).toBeCloseTo(0, 5);
  });
});
