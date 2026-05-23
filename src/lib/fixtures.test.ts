import { describe, expect, it } from "vitest";
import type { Fixture } from "../types/fixture";
import {
  addManualFixtureChannel,
  createFixture,
  fixturesOverlap,
  formatFixturePatch,
  getFixtureConflicts,
  normalizeFixtures,
  suggestNextFixtureAddress,
  updateManualFixtureChannelName,
} from "./fixtures";

function fixture(id: string, overrides: Partial<Omit<Fixture, "id">> = {}): Fixture {
  return {
    id,
    name: overrides.name ?? id,
    universe: overrides.universe ?? 1,
    startAddress: overrides.startAddress ?? 1,
    channelCount: overrides.channelCount ?? 6,
  };
}

describe("fixtures", () => {
  it("formats patch summary", () => {
    expect(
      formatFixturePatch({
        universe: 2,
        startAddress: 17,
        channelCount: 8,
      }),
    ).toBe("U2 @ 17 · 8ch");
  });

  it("detects overlapping fixtures on the same universe", () => {
    const a = fixture("a", { startAddress: 1, channelCount: 6 });
    const b = fixture("b", { startAddress: 4, channelCount: 6 });
    expect(fixturesOverlap(a, b)).toBe(true);
    expect(getFixtureConflicts(a, [a, b])).toEqual([b]);
  });

  it("ignores fixtures on different universes", () => {
    const a = fixture("a", { universe: 1, startAddress: 1, channelCount: 6 });
    const b = fixture("b", { universe: 2, startAddress: 1, channelCount: 6 });
    expect(fixturesOverlap(a, b)).toBe(false);
  });

  it("suggests the next free address on a universe", () => {
    const fixtures = [
      fixture("a", { startAddress: 1, channelCount: 6 }),
      fixture("b", { startAddress: 10, channelCount: 3 }),
    ];
    expect(suggestNextFixtureAddress(fixtures, 1)).toBe(13);
  });

  it("creates fixtures with incremental default names", () => {
    const first = createFixture([]);
    const second = createFixture([first]);
    expect(first.name).toBe("Fixture 1");
    expect(second.name).toBe("Fixture 2");
    expect(first.channelCount).toBe(1);
    expect(first.channels).toEqual([{}]);
    expect(second.startAddress).toBe(2);
  });

  it("normalizes fixture payloads from snapshots", () => {
    expect(
      normalizeFixtures([
        {
          id: "f1",
          name: "  Par 1  ",
          universe: 0,
          startAddress: 999,
          channelCount: 0,
        },
      ]),
    ).toEqual([
      {
        id: "f1",
        name: "Par 1",
        universe: 1,
        startAddress: 512,
        channelCount: 1,
        channels: [{}],
      },
    ]);
  });

  it("derives channel addresses from the start address", () => {
    const fixture = createFixture([], {
      startAddress: 10,
      channels: [{ name: "Dimmer" }, { name: "Red" }],
    });
    expect(fixture.channelCount).toBe(2);
    expect(addManualFixtureChannel(fixture)).toHaveLength(3);
    expect(updateManualFixtureChannelName(fixture, 0, " Main ")).toEqual([
      { name: "Main" },
      { name: "Red" },
    ]);
  });
});
