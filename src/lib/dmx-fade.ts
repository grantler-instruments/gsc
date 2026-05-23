import { bumpDmxOutputRevision } from "../stores/dmx-output";
import type { DmxCueData } from "../types/cue";
import type { Fixture } from "../types/fixture";
import {
  clampDmxValue,
  type DmxUniverseFrame,
  getDmxChannelLevel,
  getDmxUniverseFrame,
  normalizeDmxCueData,
  setDmxChannelLevel,
} from "./dmx";
import { fixtureChannelAddress } from "./fixtures";

export interface DmxFadeChannel {
  universe: number;
  /** 0-based index into the 512-channel universe buffer. */
  index: number;
  from: number;
  to: number;
}

export interface DmxFadePlan {
  channels: DmxFadeChannel[];
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

/** Build per-channel fade steps from current output to a light cue's levels. */
export function buildDmxFadePlan(data: DmxCueData, fixtures: Fixture[]): DmxFadePlan | null {
  if (fixtures.length === 0) return null;

  const normalized = normalizeDmxCueData(data, fixtures);
  if (normalized.mode === "partial" && normalized.fixtures.length === 0) {
    return null;
  }

  const targets = targetValuesByFixture(normalized, fixtures);
  const channels: DmxFadeChannel[] = [];

  const fixturesToFade =
    normalized.mode === "snapshot"
      ? fixtures
      : fixtures.filter((fixture) => targets.has(fixture.id));

  for (const fixture of fixturesToFade) {
    const values = targets.get(fixture.id);
    if (!values) continue;

    for (let channelIndex = 0; channelIndex < values.length; channelIndex += 1) {
      const address = fixtureChannelAddress(fixture, channelIndex);
      if (address < 1 || address > 512) continue;
      channels.push({
        universe: fixture.universe,
        index: address - 1,
        from: getDmxChannelLevel(fixture.universe, address),
        to: clampDmxValue(values[channelIndex]),
      });
    }
  }

  return channels.length > 0 ? { channels } : null;
}

export function sampleDmxFadePlan(plan: DmxFadePlan, t: number): DmxUniverseFrame[] {
  const clampedT = Math.max(0, Math.min(1, t));
  const universes = new Set<number>();

  for (const channel of plan.channels) {
    setDmxChannelLevel(
      channel.universe,
      channel.index + 1,
      channel.from + (channel.to - channel.from) * clampedT,
    );
    universes.add(channel.universe);
  }

  bumpDmxOutputRevision();
  return [...universes].sort((a, b) => a - b).map((universe) => getDmxUniverseFrame(universe));
}

export function formatLightFadeTargetSummary(data: DmxCueData, fixtures: Fixture[]): string {
  return `Light cue · ${normalizeDmxCueData(data, fixtures).fixtures.length} fixture${
    normalizeDmxCueData(data, fixtures).fixtures.length === 1 ? "" : "s"
  }`;
}
