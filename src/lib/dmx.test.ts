import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../i18n/t";
import type { Fixture } from "../types/fixture";
import {
  addAllDmxFixturesToCue,
  addDmxFixtureToCue,
  applyDmxCueToBuffers,
  clampDmxValue,
  defaultDmxCueData,
  formatDmxCue,
  normalizeDmxCueData,
  resetDmxOutputBuffers,
  resolveLightFadeDmx,
  setDmxCueMode,
  updateDmxFixtureChannelValue,
} from "./dmx";

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
      formatDmxCue(
        { mode: "partial", fixtures: [{ fixtureId: "f1", values: [255, 0] }] },
        fixtures,
      ),
    ).toBe(t("dmxPanel.fixtureChannels", { name: "Par 1", active: 1, total: 2 }));
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
    ).toBe(t("dmxPanel.sceneFixtures", { count: 2 }));
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
    const fixture = fixtures[0];
    if (!fixture) throw new Error("Expected fixture");
    const withFixture = addDmxFixtureToCue(partial, fixture);
    const snapshot = setDmxCueMode(withFixture, "snapshot", fixtures);
    expect(snapshot.mode).toBe("snapshot");
    expect(snapshot.fixtures).toHaveLength(2);
  });

  it("adds every patched fixture not already in the cue", () => {
    const fixture = fixtures[0];
    if (!fixture) throw new Error("Expected fixture");
    const data = addDmxFixtureToCue(defaultDmxCueData(fixtures), fixture);
    expect(addAllDmxFixturesToCue(data, fixtures)).toEqual({
      mode: "partial",
      fixtures: [
        { fixtureId: "f1", values: [0, 0] },
        { fixtureId: "f2", values: [0] },
      ],
    });
  });

  it("updates a single channel value", () => {
    const fixture = fixtures[0];
    if (!fixture) throw new Error("Expected fixture");
    const data = addDmxFixtureToCue(defaultDmxCueData(fixtures), fixture);
    expect(updateDmxFixtureChannelValue(data, "f1", 1, 128)).toEqual({
      mode: "partial",
      fixtures: [{ fixtureId: "f1", values: [0, 128] }],
    });
  });

  it("clamps values", () => {
    expect(clampDmxValue(-5)).toBe(0);
    expect(clampDmxValue(999)).toBe(255);
  });

  it("resolves referenced light fade fixtures with editable overrides", () => {
    const target = {
      mode: "partial" as const,
      fixtures: [
        { fixtureId: "f1", values: [100, 50] },
        { fixtureId: "f2", values: [200] },
      ],
    };
    const fade = {
      mode: "partial" as const,
      fixtures: [{ fixtureId: "f1", values: [255, 50] }],
    };

    expect(resolveLightFadeDmx(fade, target, fixtures)).toEqual({
      mode: "partial",
      fixtures: [
        { fixtureId: "f1", values: [255, 50] },
        { fixtureId: "f2", values: [200] },
      ],
    });
  });
});
