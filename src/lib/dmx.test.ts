import { describe, expect, it, beforeEach } from "vitest";
import {
  addDmxFixtureToCue,
  applyDmxCueToBuffers,
  clampDmxValue,
  defaultDmxCueData,
  formatDmxCue,
  normalizeDmxCueData,
  resetDmxOutputBuffers,
  setDmxCueMode,
  updateDmxFixtureChannelValue,
} from "./dmx";
import type { Fixture } from "../types/fixture";

const fixtures: Fixture[] = [
  {
    id: "f1",
    name: "Par 1",
    universe: 1,
    startAddress: 10,
    channelCount: 2,
    channels: [{ name: "Dimmer" }, { name: "Red" }],
  },
  {
    id: "f2",
    name: "Par 2",
    universe: 1,
    startAddress: 20,
    channelCount: 1,
  },
];

describe("dmx", () => {
  beforeEach(() => {
    resetDmxOutputBuffers();
  });

  it("creates empty partial cues by default", () => {
    expect(defaultDmxCueData(fixtures)).toEqual({
      mode: "partial",
      fixtures: [],
    });
  });

  it("writes partial cue values without affecting other fixtures", () => {
    applyDmxCueToBuffers(
      { mode: "partial", fixtures: [{ fixtureId: "f2", values: [200] }] },
      fixtures,
    );
    const frames = applyDmxCueToBuffers(
      { mode: "partial", fixtures: [{ fixtureId: "f1", values: [255, 64] }] },
      fixtures,
    );
    expect(frames[0]?.data[9]).toBe(255);
    expect(frames[0]?.data[10]).toBe(64);
    expect(frames[0]?.data[19]).toBe(200);
  });

  it("snapshot cues zero unlisted patched fixtures", () => {
    applyDmxCueToBuffers(
      { mode: "partial", fixtures: [{ fixtureId: "f2", values: [200] }] },
      fixtures,
    );
    const frames = applyDmxCueToBuffers(
      {
        mode: "snapshot",
        fixtures: [{ fixtureId: "f1", values: [255, 64] }],
      },
      fixtures,
    );
    expect(frames[0]?.data[9]).toBe(255);
    expect(frames[0]?.data[10]).toBe(64);
    expect(frames[0]?.data[19]).toBe(0);
  });

  it("formats partial and snapshot summaries", () => {
    expect(
      formatDmxCue({ mode: "partial", fixtures: [{ fixtureId: "f1", values: [255, 0] }] }, fixtures),
    ).toBe("Par 1 · 1/2 ch");
    expect(
      formatDmxCue(
        {
          mode: "snapshot",
          fixtures: [
            { fixtureId: "f1", values: [0, 0] },
            { fixtureId: "f2", values: [0] },
          ],
        },
        fixtures,
      ),
    ).toBe("Scene · 2 fixtures");
  });

  it("normalizes snapshot cues to the full patch", () => {
    expect(
      normalizeDmxCueData(
        { mode: "snapshot", fixtures: [{ fixtureId: "f1", values: [300, 12, 99] }] },
        fixtures,
      ),
    ).toEqual({
      mode: "snapshot",
      fixtures: [
        { fixtureId: "f1", values: [255, 12] },
        { fixtureId: "f2", values: [0] },
      ],
    });
  });

  it("normalizes partial cues to listed fixtures only", () => {
    expect(
      normalizeDmxCueData(
        { mode: "partial", fixtures: [{ fixtureId: "f1", values: [128, 64] }] },
        fixtures,
      ),
    ).toEqual({
      mode: "partial",
      fixtures: [{ fixtureId: "f1", values: [128, 64] }],
    });
  });

  it("switches modes through the helper", () => {
    const partial = defaultDmxCueData(fixtures);
    const withFixture = addDmxFixtureToCue(partial, fixtures[0]!);
    const snapshot = setDmxCueMode(withFixture, "snapshot", fixtures);
    expect(snapshot.mode).toBe("snapshot");
    expect(snapshot.fixtures).toHaveLength(2);
  });

  it("updates a single channel value", () => {
    const data = addDmxFixtureToCue(defaultDmxCueData(fixtures), fixtures[0]!);
    expect(updateDmxFixtureChannelValue(data, "f1", 1, 128)).toEqual({
      mode: "partial",
      fixtures: [{ fixtureId: "f1", values: [0, 128] }],
    });
  });

  it("clamps values", () => {
    expect(clampDmxValue(-5)).toBe(0);
    expect(clampDmxValue(999)).toBe(255);
  });
});
