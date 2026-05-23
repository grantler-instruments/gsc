import type { DmxCueData } from "../types/cue";
import type { Fixture } from "../types/fixture";
import { normalizeDmxCueData } from "./dmx";

export function cloneDmxCueData(data: DmxCueData): DmxCueData {
  return {
    mode: data.mode,
    fixtures: data.fixtures.map((entry) => ({
      fixtureId: entry.fixtureId,
      values: [...entry.values],
    })),
  };
}

export function dmxCueDataEqual(a: DmxCueData, b: DmxCueData, fixtures: Fixture[]): boolean {
  const left = normalizeDmxCueData(a, fixtures);
  const right = normalizeDmxCueData(b, fixtures);
  return JSON.stringify(left) === JSON.stringify(right);
}

export function snapshotDmxCueData(data: DmxCueData, fixtures: Fixture[]): DmxCueData {
  return cloneDmxCueData(normalizeDmxCueData(data, fixtures));
}
