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
import {
  clampDmx16BitValue,
  combine16BitValue,
  iterateFixtureLogicalChannels,
  split16BitValue,
} from "./fixture-channels";
import { fixtureChannelAddress } from "./fixtures";

export interface DmxFadeChannel {
  universe: number;
  /** 0-based index into the 512-channel universe buffer. */
  index: number;
  from: number;
  to: number;
  /** When set, `from`/`to` are combined 16-bit values written to index and index+1. */
  resolution?: "16bit";
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

    for (const logical of iterateFixtureLogicalChannels(fixture)) {
      const address = fixtureChannelAddress(fixture, logical.slotIndex);
      if (address < 1 || address > 512) continue;

      if (logical.is16Bit) {
        const fineAddress = address + 1;
        if (fineAddress > 512) continue;
        channels.push({
          universe: fixture.universe,
          index: address - 1,
          from: combine16BitValue(
            getDmxChannelLevel(fixture.universe, address),
            getDmxChannelLevel(fixture.universe, fineAddress),
          ),
          to: combine16BitValue(values[logical.slotIndex] ?? 0, values[logical.slotIndex + 1] ?? 0),
          resolution: "16bit",
        });
        continue;
      }

      channels.push({
        universe: fixture.universe,
        index: address - 1,
        from: getDmxChannelLevel(fixture.universe, address),
        to: clampDmxValue(values[logical.slotIndex] ?? 0),
      });
    }
  }

  return channels.length > 0 ? { channels } : null;
}

export function sampleDmxFadePlan(plan: DmxFadePlan, t: number): DmxUniverseFrame[] {
  const clampedT = Math.max(0, Math.min(1, t));
  const universes = new Set<number>();

  for (const channel of plan.channels) {
    const blended = channel.from + (channel.to - channel.from) * clampedT;

    if (channel.resolution === "16bit") {
      const { coarse, fine } = split16BitValue(clampDmx16BitValue(blended));
      setDmxChannelLevel(channel.universe, channel.index + 1, coarse);
      setDmxChannelLevel(channel.universe, channel.index + 2, fine);
    } else {
      setDmxChannelLevel(channel.universe, channel.index + 1, blended);
    }
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
