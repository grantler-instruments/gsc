import { describe, expect, it } from "vitest";
import {
  detectFixtureColorTriplet,
  fixtureColorTripletHex,
  hexToRgb,
  readFixtureTripletValues,
  rgbToHex,
  writeFixtureTripletValues,
} from "./fixture-color";
import type { FixtureInspectorChannel } from "./fixture-inspector-groups";

function channel(
  channelIndex: number,
  kind: FixtureInspectorChannel["kind"],
): FixtureInspectorChannel {
  return {
    channelIndex,
    label: kind,
    kind,
    resolution: "8bit",
  };
}

describe("fixture-color", () => {
  it("detects rgb triplets", () => {
    const triplet = detectFixtureColorTriplet([
      channel(0, "red"),
      channel(1, "green"),
      channel(2, "blue"),
      channel(3, "white"),
    ]);
    expect(triplet?.mode).toBe("rgb");
    expect(triplet?.channels).toEqual([0, 1, 2]);
  });

  it("detects cmy triplets when rgb is absent", () => {
    const triplet = detectFixtureColorTriplet([
      channel(0, "cyan"),
      channel(1, "magenta"),
      channel(2, "yellow"),
    ]);
    expect(triplet?.mode).toBe("cmy");
  });

  it("converts hex to rgb dmx writes", () => {
    const triplet = detectFixtureColorTriplet([
      channel(0, "red"),
      channel(1, "green"),
      channel(2, "blue"),
    ]);
    if (!triplet) throw new Error("Expected rgb triplet");

    const rgb = hexToRgb("#ff8040");
    expect(rgb).toEqual({ r: 255, g: 128, b: 64 });
    expect(writeFixtureTripletValues(triplet, rgb!)).toEqual([
      { channelIndex: 0, value: 255 },
      { channelIndex: 1, value: 128 },
      { channelIndex: 2, value: 64 },
    ]);
  });

  it("reads and writes cmy through rgb hex", () => {
    const triplet = detectFixtureColorTriplet([
      channel(0, "cyan"),
      channel(1, "magenta"),
      channel(2, "yellow"),
    ]);
    if (!triplet) throw new Error("Expected cmy triplet");

    const updates = writeFixtureTripletValues(triplet, { r: 255, g: 0, b: 0 });
    expect(updates).toEqual([
      { channelIndex: 0, value: 0 },
      { channelIndex: 1, value: 255 },
      { channelIndex: 2, value: 255 },
    ]);

    const values = [0, 255, 255];
    expect(readFixtureTripletValues(triplet, values)).toEqual({ r: 255, g: 0, b: 0 });
    expect(fixtureColorTripletHex(triplet, values)).toBe(rgbToHex({ r: 255, g: 0, b: 0 }));
  });
});
