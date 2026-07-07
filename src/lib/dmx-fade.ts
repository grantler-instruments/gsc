import { bumpDmxOutputRevision } from "../stores/dmx-output";
import type { DmxCueData, LightFadeChannelScope } from "../types/cue";
import type { Fixture } from "../types/fixture";
import {
  clampDmxValue,
  type DmxUniverseFrame,
  getDmxUniverseFrame,
  normalizeDmxCueData,
  readFixtureValuesFromOutput,
  setDmxChannelLevel,
} from "./dmx";
import { interpolateFixtureFadeValues } from "./dmx-fade-semantic";
import { fixtureChannelAddress } from "./fixtures";

export interface DmxFadeFixtureEntry {
  fixture: Fixture;
  fromValues: number[];
  toValues: number[];
}

export interface DmxFadePlan {
  entries: DmxFadeFixtureEntry[];
  channelScope: LightFadeChannelScope;
}

function targetValuesByFixture(data: DmxCueData, fixtures: Fixture[]): Map<string, number[]> {
  const normalized = normalizeDmxCueData(data, fixtures);
  const byId = new Map(normalized.fixtures.map((entry) => [entry.fixtureId, entry.values]));

  if (normalized.mode === "snapshot") {
    return new Map(
      fixtures.map((fixture) => [
        fixture.id,
        byId.get(fixture.id) ?? Array.from({ length: fixture.channelCount }, () => 0),
      ]),
    );
  }

  return byId;
}

/** Build per-fixture fade steps from current output to a light cue's levels. */
export function buildDmxFadePlan(
  data: DmxCueData,
  fixtures: Fixture[],
  channelScope: LightFadeChannelScope = "all",
): DmxFadePlan | null {
  if (fixtures.length === 0) return null;

  const normalized = normalizeDmxCueData(data, fixtures);
  if (normalized.mode === "partial" && normalized.fixtures.length === 0) {
    return null;
  }

  const targets = targetValuesByFixture(normalized, fixtures);
  const entries: DmxFadeFixtureEntry[] = [];

  const fixturesToFade =
    normalized.mode === "snapshot"
      ? fixtures
      : fixtures.filter((fixture) => targets.has(fixture.id));

  for (const fixture of fixturesToFade) {
    const toValues = targets.get(fixture.id);
    if (!toValues) continue;

    entries.push({
      fixture,
      fromValues: readFixtureValuesFromOutput(fixture),
      toValues: toValues.map((value) => clampDmxValue(value)),
    });
  }

  return entries.length > 0 ? { entries, channelScope } : null;
}

export function sampleDmxFadePlan(plan: DmxFadePlan, t: number): DmxUniverseFrame[] {
  const clampedT = Math.max(0, Math.min(1, t));
  const universes = new Set<number>();

  for (const entry of plan.entries) {
    const values = interpolateFixtureFadeValues(
      entry.fixture,
      entry.fromValues,
      entry.toValues,
      clampedT,
      plan.channelScope,
    );

    for (let channelIndex = 0; channelIndex < values.length; channelIndex += 1) {
      const address = fixtureChannelAddress(entry.fixture, channelIndex);
      if (address < 1 || address > 512) continue;
      setDmxChannelLevel(entry.fixture.universe, address, values[channelIndex] ?? 0);
      universes.add(entry.fixture.universe);
    }
  }

  bumpDmxOutputRevision();
  return [...universes].sort((a, b) => a - b).map((universe) => getDmxUniverseFrame(universe));
}

export function formatLightFadeTargetSummary(data: DmxCueData, fixtures: Fixture[]): string {
  return `Light cue · ${normalizeDmxCueData(data, fixtures).fixtures.length} fixture${
    normalizeDmxCueData(data, fixtures).fixtures.length === 1 ? "" : "s"
  }`;
}
