import { describe, expect, it } from "vitest";
import type { FixtureOflProfile } from "../types/fixture";
import {
  findFirstChannelByKind,
  fixtureHasRgbChannels,
  fixtureIsMovingHead,
  normalizeOflChannel,
} from "./fixture-definition";

const rgbProfile: FixtureOflProfile = {
  filePath: "/assets/fixtures/ofl/generic/rgb.json",
  manufacturerKey: "generic",
  manufacturer: "Generic",
  fixtureKey: "rgb",
  model: "RGB",
  modeName: "4ch",
  categories: ["Color Changer"],
  channels: [
    { key: "Red", kind: "red" },
    { key: "Green", kind: "green" },
    { key: "Blue", kind: "blue" },
    { key: "Dimmer", kind: "intensity" },
  ],
};

describe("fixture-definition", () => {
  it("infers kind for legacy channels that only stored keys", () => {
    expect(normalizeOflChannel({ key: "Pan fine" }).kind).toBe("pan");
    expect(normalizeOflChannel({ key: "Dimmer 1" }).kind).toBe("intensity");
  });

  it("finds rgb and intensity channels by kind", () => {
    expect(fixtureHasRgbChannels(rgbProfile)).toBe(true);
    expect(findFirstChannelByKind(rgbProfile, "intensity")).toBe(3);
    expect(findFirstChannelByKind(rgbProfile, "red")).toBe(0);
  });

  it("detects moving heads from categories or pan/tilt channels", () => {
    const fixture = {
      id: "m1",
      name: "Spot",
      universe: 1,
      startAddress: 1,
      channelCount: 4,
      ofl: {
        ...rgbProfile,
        categories: ["Moving Head"],
        channels: [
          { key: "Pan", kind: "pan" as const, fineIndex: 1 },
          { key: "Pan fine", kind: "pan" as const, coarseIndex: 0 },
          { key: "Tilt", kind: "tilt" as const, fineIndex: 3 },
          { key: "Tilt fine", kind: "tilt" as const, coarseIndex: 2 },
        ],
      },
    };

    expect(fixtureIsMovingHead(fixture)).toBe(true);
  });
});
