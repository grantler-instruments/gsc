import { describe, expect, it } from "vitest";
import {
  cloneDmxCueData,
  dmxCueDataEqual,
  snapshotDmxCueData,
} from "./dmx-preview-session";
import type { Fixture } from "../types/fixture";

const fixtures: Fixture[] = [
  {
    id: "a",
    name: "Front",
    universe: 1,
    startAddress: 1,
    channelCount: 2,
  },
];

describe("dmx-preview-session helpers", () => {
  it("clones and compares cue data", () => {
    const data = {
      mode: "partial" as const,
      fixtures: [{ fixtureId: "a", values: [10, 20] }],
    };

    const clone = cloneDmxCueData(data);
    clone.fixtures[0].values[0] = 99;

    expect(dmxCueDataEqual(data, cloneDmxCueData(data), fixtures)).toBe(true);
    expect(
      dmxCueDataEqual(data, { ...data, fixtures: [{ fixtureId: "a", values: [99, 20] }] }, fixtures),
    ).toBe(false);
  });

  it("snapshots normalized cue data", () => {
    expect(
      snapshotDmxCueData(
        { mode: "partial", fixtures: [{ fixtureId: "a", values: [5] }] },
        fixtures,
      ),
    ).toEqual({
      mode: "partial",
      fixtures: [{ fixtureId: "a", values: [5, 0] }],
    });
  });
});
