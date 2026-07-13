import { t } from "../i18n/t";
import type { Fixture, FixtureChannel } from "../types/fixture";
import { normalizeFixtureChannel, repairFixtureChannelPairs } from "./fixture-channels";
import { normalizeFixtureOflProfile, oflProfileChannelCount } from "./ofl/profile";
import { randomId } from "./random-id";

export const DMX_UNIVERSE_SIZE = 512;
export const DEFAULT_FIXTURE_CHANNEL_COUNT = 1;

export function clampUniverse(value: number): number {
  return Math.max(1, Math.min(32768, Math.floor(value) || 1));
}

export function clampStartAddress(value: number): number {
  return Math.max(1, Math.min(DMX_UNIVERSE_SIZE, Math.floor(value) || 1));
}

export function clampChannelCount(value: number): number {
  return Math.max(1, Math.min(DMX_UNIVERSE_SIZE, Math.floor(value) || 1));
}

export function fixtureChannelAddress(
  fixture: Pick<Fixture, "startAddress">,
  index: number,
): number {
  return fixture.startAddress + index;
}

export function normalizeFixtureChannels(
  channels: FixtureChannel[] | undefined,
  channelCount: number,
): FixtureChannel[] {
  if (channels?.length) {
    return repairFixtureChannelPairs(channels.map((channel) => normalizeFixtureChannel(channel)));
  }
  return Array.from({ length: clampChannelCount(channelCount) }, () => ({}));
}

export function fixtureEndAddress(fixture: Pick<Fixture, "startAddress" | "channelCount">): number {
  return fixture.startAddress + fixture.channelCount - 1;
}

export function fixtureFitsInUniverse(
  fixture: Pick<Fixture, "startAddress" | "channelCount">,
): boolean {
  return fixtureEndAddress(fixture) <= DMX_UNIVERSE_SIZE;
}

export function formatFixturePatch(
  fixture: Pick<Fixture, "universe" | "startAddress" | "channelCount">,
): string {
  return `U${fixture.universe} @ ${fixture.startAddress} · ${fixture.channelCount}ch`;
}

export function formatFixtureListDetail(fixture: Fixture): string {
  const patch = formatFixturePatch(fixture);
  if (fixture.ofl) {
    return `${fixture.ofl.manufacturer} ${fixture.ofl.model} · ${fixture.ofl.modeName} · ${patch}`;
  }
  return patch;
}

export function fixturesOverlap(
  a: Pick<Fixture, "id" | "universe" | "startAddress" | "channelCount">,
  b: Pick<Fixture, "id" | "universe" | "startAddress" | "channelCount">,
): boolean {
  if (a.universe !== b.universe || a.id === b.id) return false;
  return a.startAddress <= fixtureEndAddress(b) && b.startAddress <= fixtureEndAddress(a);
}

export function getFixtureConflicts(fixture: Fixture, fixtures: Fixture[]): Fixture[] {
  return fixtures.filter((other) => fixturesOverlap(fixture, other));
}

export function suggestNextFixtureAddress(fixtures: Fixture[], universe = 1): number {
  const ends = fixtures
    .filter((fixture) => fixture.universe === universe)
    .map((fixture) => fixtureEndAddress(fixture) + 1);
  const next = ends.length > 0 ? Math.max(...ends) : 1;
  return clampStartAddress(next > DMX_UNIVERSE_SIZE ? 1 : next);
}

export function defaultFixtureName(fixtures: Fixture[]): string {
  let index = fixtures.length + 1;
  while (
    fixtures.some((fixture) => fixture.name === t("fixtures.defaultName", { number: index }))
  ) {
    index += 1;
  }
  return t("fixtures.defaultName", { number: index });
}

function applyFixtureProfile(fixture: Fixture, overrides: Partial<Omit<Fixture, "id">>): void {
  if (!overrides.ofl) return;
  fixture.ofl = normalizeFixtureOflProfile(overrides.ofl);
  fixture.channels = undefined;
  fixture.channelCount = clampChannelCount(oflProfileChannelCount(fixture.ofl));
}

function syncManualFixtureChannels(fixture: Fixture, channelsOverride?: FixtureChannel[]): void {
  if (fixtureHasProfile(fixture)) {
    fixture.channels = undefined;
    return;
  }

  fixture.channels = normalizeFixtureChannels(
    channelsOverride ?? fixture.channels,
    fixture.channelCount,
  );
  fixture.channelCount = fixture.channels.length;
}

export function createFixture(
  fixtures: Fixture[],
  overrides: Partial<Omit<Fixture, "id">> = {},
): Fixture {
  const universe = clampUniverse(overrides.universe ?? 1);
  const fixture: Fixture = {
    id: randomId(),
    name: overrides.name ?? defaultFixtureName(fixtures),
    universe,
    startAddress: clampStartAddress(
      overrides.startAddress ?? suggestNextFixtureAddress(fixtures, universe),
    ),
    channelCount: clampChannelCount(overrides.channelCount ?? DEFAULT_FIXTURE_CHANNEL_COUNT),
  };

  applyFixtureProfile(fixture, overrides);

  if (!fixtureHasProfile(fixture)) {
    fixture.channels = normalizeFixtureChannels(overrides.channels, fixture.channelCount);
    fixture.channelCount = fixture.channels.length;
  }

  return fixture;
}

export function normalizeFixture(raw: Partial<Fixture> & Pick<Fixture, "id">): Fixture {
  const startAddress = clampStartAddress(raw.startAddress ?? 1);
  const fixture: Fixture = {
    id: raw.id,
    name: raw.name?.trim() || "Untitled fixture",
    universe: clampUniverse(raw.universe ?? 1),
    startAddress,
    channelCount: clampChannelCount(raw.channelCount ?? DEFAULT_FIXTURE_CHANNEL_COUNT),
  };

  if (raw.ofl) {
    fixture.ofl = normalizeFixtureOflProfile(raw.ofl);
    fixture.channelCount = clampChannelCount(oflProfileChannelCount(fixture.ofl));
  }

  syncManualFixtureChannels(fixture, raw.channels);
  return fixture;
}

export function normalizeFixtures(fixtures: Fixture[] | undefined): Fixture[] {
  if (!fixtures?.length) return [];
  return fixtures.map((fixture) => normalizeFixture(fixture));
}

export function fixtureHasProfile(fixture: Fixture): boolean {
  return Boolean(fixture.ofl);
}

export function manualFixtureChannels(fixture: Fixture): FixtureChannel[] {
  return fixture.channels ?? [{ name: undefined }];
}

/** Logical manual channels for the fixture editor (skips fine slots). */
export function manualFixtureLogicalChannels(fixture: Fixture): Array<{
  slotIndex: number;
  channel: FixtureChannel;
}> {
  const channels = manualFixtureChannels(fixture);
  return channels
    .map((channel, slotIndex) => ({ slotIndex, channel }))
    .filter(({ channel }) => channel.resolution !== "fine");
}

export function addManualFixtureChannel(fixture: Fixture): FixtureChannel[] {
  return [...manualFixtureChannels(fixture), {}];
}

export function updateManualFixtureChannelName(
  fixture: Fixture,
  index: number,
  name: string,
): FixtureChannel[] {
  return manualFixtureChannels(fixture).map((channel, channelIndex) =>
    channelIndex === index ? { ...channel, name: name.trim() || undefined } : channel,
  );
}

export function setManualFixtureChannel16Bit(
  fixture: Fixture,
  slotIndex: number,
  enabled: boolean,
): FixtureChannel[] {
  const channels = manualFixtureChannels(fixture).map((channel) => ({ ...channel }));

  if (enabled) {
    channels[slotIndex] = {
      ...channels[slotIndex],
      resolution: "16bit",
    };
    const next = channels[slotIndex + 1];
    if (next?.resolution === "fine") {
      return channels;
    }
    if (slotIndex + 1 < channels.length) {
      channels.splice(slotIndex + 1, 0, { resolution: "fine" });
    } else {
      channels.push({ resolution: "fine" });
    }
    return repairFixtureChannelPairs(channels);
  }

  channels[slotIndex] = {
    ...channels[slotIndex],
    resolution: undefined,
  };
  if (channels[slotIndex + 1]?.resolution === "fine") {
    channels.splice(slotIndex + 1, 1);
  }
  return channels;
}

export function removeManualFixtureChannel(fixture: Fixture, index: number): FixtureChannel[] {
  const channels = manualFixtureChannels(fixture);
  if (channels.length <= 1) return channels;

  const channel = channels[index];
  if (!channel) return channels;

  if (channel.resolution === "16bit" && channels[index + 1]?.resolution === "fine") {
    return channels.filter(
      (_, channelIndex) => channelIndex !== index && channelIndex !== index + 1,
    );
  }

  if (channel.resolution === "fine") {
    return channels.filter((_, channelIndex) => channelIndex !== index);
  }

  return channels.filter((_, channelIndex) => channelIndex !== index);
}

export function manualFixtureChannelCountAfterAdd(fixture: Fixture): number {
  return manualFixtureChannels(fixture).length + 1;
}

export function manualFixtureChannelCountAfter16BitToggle(
  fixture: Fixture,
  slotIndex: number,
  enabled: boolean,
): number {
  const channels = manualFixtureChannels(fixture);
  if (enabled) {
    if (channels[slotIndex + 1]?.resolution === "fine") return channels.length;
    return channels.length + 1;
  }
  if (
    channels[slotIndex]?.resolution === "16bit" &&
    channels[slotIndex + 1]?.resolution === "fine"
  ) {
    return channels.length - 1;
  }
  return channels.length;
}
