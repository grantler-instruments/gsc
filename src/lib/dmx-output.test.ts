import { beforeEach, describe, expect, it } from "vitest";
import type { Fixture } from "../types/fixture";
import { applyDmxCueToBuffers, resetDmxOutputBuffers } from "./dmx";
import { groupDmxOutputChannelsByFixture, listDmxOutputChannels } from "./dmx-output";

function fixture(id: string, overrides: Partial<Omit<Fixture, "id">> = {}): Fixture {
  return {
    id,
    name: overrides.name ?? id,
    universe: overrides.universe ?? 1,
    startAddress: overrides.startAddress ?? 1,
    channelCount: overrides.channelCount ?? 3,
  };
}

describe("dmx-output", () => {
  beforeEach(() => {
    resetDmxOutputBuffers();
  });

  it("lists patched channels with live buffer values", () => {
    const fixtures = [
      fixture("a", { name: "Front", startAddress: 1, channelCount: 2 }),
      fixture("b", { name: "Back", startAddress: 10, channelCount: 1 }),
    ];

    applyDmxCueToBuffers(
      {
        mode: "partial",
        fixtures: [
          { fixtureId: "a", values: [128, 64] },
          { fixtureId: "b", values: [255] },
        ],
      },
      fixtures,
    );

    expect(listDmxOutputChannels(fixtures)).toEqual([
      expect.objectContaining({
        fixtureId: "a",
        fixtureName: "Front",
        address: 1,
        channelIndex: 0,
        value: 128,
      }),
      expect.objectContaining({
        fixtureId: "a",
        fixtureName: "Front",
        address: 2,
        channelIndex: 1,
        value: 64,
      }),
      expect.objectContaining({
        fixtureId: "b",
        fixtureName: "Back",
        address: 10,
        channelIndex: 0,
        value: 255,
      }),
    ]);
  });

  it("groups channels by fixture", () => {
    const fixtures = [fixture("a", { channelCount: 2 })];

    applyDmxCueToBuffers(
      {
        mode: "partial",
        fixtures: [{ fixtureId: "a", values: [10, 20] }],
      },
      fixtures,
    );

    expect(groupDmxOutputChannelsByFixture(listDmxOutputChannels(fixtures))).toEqual([
      {
        fixtureId: "a",
        fixtureName: "a",
        channels: expect.arrayContaining([
          expect.objectContaining({ channelIndex: 0, value: 10 }),
          expect.objectContaining({ channelIndex: 1, value: 20 }),
        ]),
      },
    ]);
  });
});
