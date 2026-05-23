import { fixtureChannelAddress } from "./fixtures";
import { bumpDmxOutputRevision } from "../stores/dmx-output";
import type { DmxCueData, DmxCueMode, DmxFixtureValues } from "../types/cue";
import type { Fixture } from "../types/fixture";

export const DMX_VALUE_MAX = 255;
export const DEFAULT_ART_NET_HOST = "127.0.0.1";
export const DEFAULT_ART_NET_PORT = 6454;

const universeBuffers = new Map<number, Uint8Array>();

export function clampDmxValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(DMX_VALUE_MAX, Math.round(value)));
}

export function defaultDmxCueData(_fixtures: Fixture[] = []): DmxCueData {
  return {
    mode: "partial",
    fixtures: [],
  };
}

function normalizeDmxFixtureEntry(
  entry: Partial<DmxFixtureValues> & Pick<DmxFixtureValues, "fixtureId">,
  fixture: Fixture | undefined,
): DmxFixtureValues | null {
  if (!fixture) return null;
  const values = Array.from({ length: fixture.channelCount }, (_, index) =>
    clampDmxValue(entry.values?.[index] ?? 0),
  );
  return { fixtureId: entry.fixtureId, values };
}

function normalizePartialFixtures(
  entries: DmxFixtureValues[],
  fixtures: Fixture[],
): DmxFixtureValues[] {
  const byId = new Map(entries.map((entry) => [entry.fixtureId, entry]));
  return fixtures
    .filter((fixture) => byId.has(fixture.id))
    .map((fixture) =>
      normalizeDmxFixtureEntry(byId.get(fixture.id)!, fixture),
    )
    .filter((entry): entry is DmxFixtureValues => entry !== null);
}

function normalizeSnapshotFixtures(
  entries: DmxFixtureValues[],
  fixtures: Fixture[],
): DmxFixtureValues[] {
  const byId = new Map(entries.map((entry) => [entry.fixtureId, entry]));
  return fixtures
    .map((fixture) => {
      const existing = byId.get(fixture.id);
      return normalizeDmxFixtureEntry(
        existing ?? { fixtureId: fixture.id, values: [] },
        fixture,
      );
    })
    .filter((entry): entry is DmxFixtureValues => entry !== null);
}

export function normalizeDmxCueMode(mode: DmxCueMode | undefined): DmxCueMode {
  return mode === "snapshot" ? "snapshot" : "partial";
}

export function normalizeDmxCueData(
  raw: Partial<DmxCueData> | undefined,
  fixtures: Fixture[],
): DmxCueData {
  const mode = normalizeDmxCueMode(raw?.mode);
  const entries = raw?.fixtures ?? [];
  return {
    mode,
    fixtures:
      mode === "snapshot"
        ? normalizeSnapshotFixtures(entries, fixtures)
        : normalizePartialFixtures(entries, fixtures),
  };
}

export function setDmxCueMode(
  data: DmxCueData,
  mode: DmxCueMode,
  fixtures: Fixture[],
): DmxCueData {
  return normalizeDmxCueData({ ...data, mode }, fixtures);
}

export function addDmxFixtureToCue(
  data: DmxCueData,
  fixture: Fixture,
): DmxCueData {
  if (data.fixtures.some((entry) => entry.fixtureId === fixture.id)) {
    return data;
  }
  return {
    ...data,
    fixtures: [
      ...data.fixtures,
      {
        fixtureId: fixture.id,
        values: Array.from({ length: fixture.channelCount }, () => 0),
      },
    ],
  };
}

export function addAllDmxFixturesToCue(
  data: DmxCueData,
  fixtures: Fixture[],
): DmxCueData {
  let next = data;
  for (const fixture of availableDmxFixtures(data, fixtures)) {
    next = addDmxFixtureToCue(next, fixture);
  }
  return next;
}

export function removeDmxFixtureFromCue(
  data: DmxCueData,
  fixtureId: string,
): DmxCueData {
  return {
    ...data,
    fixtures: data.fixtures.filter((entry) => entry.fixtureId !== fixtureId),
  };
}

export function formatDmxCue(data: DmxCueData, fixtures: Fixture[]): string {
  if (data.mode === "snapshot") {
    return `Scene · ${data.fixtures.length} fixture${data.fixtures.length === 1 ? "" : "s"}`;
  }
  if (data.fixtures.length === 0) return "No fixtures";
  const labels = data.fixtures
    .map((entry) => {
      const fixture = fixtures.find((item) => item.id === entry.fixtureId);
      if (!fixture) return null;
      const active = entry.values.filter((value) => value > 0).length;
      return `${fixture.name} · ${active}/${entry.values.length} ch`;
    })
    .filter((label): label is string => label !== null);
  return labels.length > 0 ? labels.join(" · ") : `${data.fixtures.length} fixtures`;
}

export function fixtureChannelLabel(
  fixture: Fixture,
  channelIndex: number,
): string | undefined {
  const manualName = fixture.channels?.[channelIndex]?.name;
  if (manualName) return manualName;
  const oflKey = fixture.ofl?.channels[channelIndex]?.key;
  if (oflKey) return oflKey;
  return undefined;
}

function getUniverseBuffer(universe: number): Uint8Array {
  let buffer = universeBuffers.get(universe);
  if (!buffer) {
    buffer = new Uint8Array(512);
    universeBuffers.set(universe, buffer);
  }
  return buffer;
}

export function getDmxChannelLevel(universe: number, address: number): number {
  if (address < 1 || address > 512) return 0;
  return getUniverseBuffer(universe)[address - 1] ?? 0;
}

export function setDmxChannelLevel(
  universe: number,
  address: number,
  value: number,
): void {
  if (address < 1 || address > 512) return;
  getUniverseBuffer(universe)[address - 1] = clampDmxValue(value);
}

export function getDmxUniverseFrame(universe: number): DmxUniverseFrame {
  return {
    universe,
    data: new Uint8Array(getUniverseBuffer(universe)),
  };
}

function zeroFixtureInBuffer(fixture: Fixture, affected: Set<number>): void {
  const buffer = getUniverseBuffer(fixture.universe);
  for (let index = 0; index < fixture.channelCount; index += 1) {
    const address = fixtureChannelAddress(fixture, index);
    if (address < 1 || address > 512) continue;
    buffer[address - 1] = 0;
    affected.add(fixture.universe);
  }
}

function writeFixtureValuesToBuffer(
  fixture: Fixture,
  values: number[],
  affected: Set<number>,
): void {
  const buffer = getUniverseBuffer(fixture.universe);
  for (let index = 0; index < values.length; index += 1) {
    const address = fixtureChannelAddress(fixture, index);
    if (address < 1 || address > 512) continue;
    buffer[address - 1] = clampDmxValue(values[index]);
    affected.add(fixture.universe);
  }
}

export function resetDmxOutputBuffers(): void {
  universeBuffers.clear();
  bumpDmxOutputRevision();
}

export function getDmxUniverseBuffer(universe: number): Uint8Array {
  return new Uint8Array(getUniverseBuffer(universe));
}

export interface DmxUniverseFrame {
  universe: number;
  data: Uint8Array;
}

export function applyDmxCueToBuffers(
  data: DmxCueData,
  fixtures: Fixture[],
): DmxUniverseFrame[] {
  const normalized = normalizeDmxCueData(data, fixtures);
  const affected = new Set<number>();

  if (normalized.mode === "snapshot") {
    for (const fixture of fixtures) {
      zeroFixtureInBuffer(fixture, affected);
    }
  }

  for (const entry of normalized.fixtures) {
    const fixture = fixtures.find((item) => item.id === entry.fixtureId);
    if (!fixture) continue;
    writeFixtureValuesToBuffer(fixture, entry.values, affected);
  }

  const frames = [...affected]
    .sort((a, b) => a - b)
    .map((universe) => ({
      universe,
      data: new Uint8Array(getUniverseBuffer(universe)),
    }));

  bumpDmxOutputRevision();
  return frames;
}

export function updateDmxFixtureChannelValue(
  data: DmxCueData,
  fixtureId: string,
  channelIndex: number,
  value: number,
): DmxCueData {
  return {
    ...data,
    fixtures: data.fixtures.map((entry) =>
      entry.fixtureId === fixtureId
        ? {
            ...entry,
            values: entry.values.map((current, index) =>
              index === channelIndex ? clampDmxValue(value) : current,
            ),
          }
        : entry,
    ),
  };
}

export function artNetUniverseFromFixtureUniverse(universe: number): number {
  return Math.max(0, Math.floor(universe) - 1);
}

export function availableDmxFixtures(
  data: DmxCueData,
  fixtures: Fixture[],
): Fixture[] {
  const used = new Set(data.fixtures.map((entry) => entry.fixtureId));
  return fixtures.filter((fixture) => !used.has(fixture.id));
}

/** Merge a referenced light cue's fixture list with editable fade target values. */
export function resolveLightFadeDmx(
  fadeDmx: DmxCueData,
  targetDmx: DmxCueData,
  fixtures: Fixture[],
): DmxCueData {
  const normalizedTarget = normalizeDmxCueData(targetDmx, fixtures);
  const normalizedFade = normalizeDmxCueData(fadeDmx, fixtures);
  const fadeValuesById = new Map(
    normalizedFade.fixtures.map((entry) => [entry.fixtureId, entry.values]),
  );

  return {
    mode: normalizedTarget.mode,
    fixtures: normalizedTarget.fixtures.map((entry) => ({
      fixtureId: entry.fixtureId,
      values: fadeValuesById.get(entry.fixtureId) ?? [...entry.values],
    })),
  };
}

/** Copy fixture list and levels from a referenced light cue into a light fade. */
export function syncLightFadeDmxFromTarget(
  _fadeDmx: DmxCueData,
  targetDmx: DmxCueData,
  fixtures: Fixture[],
): DmxCueData {
  return normalizeDmxCueData(targetDmx, fixtures);
}
