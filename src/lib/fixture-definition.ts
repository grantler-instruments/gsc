import type {
  Fixture,
  FixtureChannelKind,
  FixtureOflChannel,
  FixtureOflProfile,
} from "../types/fixture";
import { inferKindFromKey } from "./ofl/parse-definition";

const RGB_KINDS: ReadonlySet<FixtureChannelKind> = new Set([
  "red",
  "green",
  "blue",
  "cyan",
  "magenta",
  "yellow",
]);

const COLOR_KINDS: ReadonlySet<FixtureChannelKind> = new Set([
  ...RGB_KINDS,
  "white",
  "amber",
  "warmWhite",
  "coldWhite",
  "lime",
  "uv",
]);

export function normalizeOflChannel(
  raw: Partial<FixtureOflChannel> & Pick<FixtureOflChannel, "key">,
): FixtureOflChannel {
  const key = raw.key?.trim() ?? "";
  const kind = raw.kind ?? inferKindFromKey(key);

  return {
    key,
    kind,
    ...(raw.coarseIndex !== undefined ? { coarseIndex: raw.coarseIndex } : {}),
    ...(raw.fineIndex !== undefined ? { fineIndex: raw.fineIndex } : {}),
    ...(raw.angleRange ? { angleRange: raw.angleRange } : {}),
    ...(raw.colorTemperatureRange ? { colorTemperatureRange: raw.colorTemperatureRange } : {}),
    ...(raw.capabilities?.length ? { capabilities: raw.capabilities } : {}),
    ...(raw.wheel ? { wheel: raw.wheel } : {}),
  };
}

export function fixtureOflChannels(profile: FixtureOflProfile | undefined): FixtureOflChannel[] {
  return profile?.channels ?? [];
}

export function fixtureChannelAt(
  profile: FixtureOflProfile | undefined,
  channelIndex: number,
): FixtureOflChannel | undefined {
  return profile?.channels[channelIndex];
}

export function fixtureChannelKind(
  profile: FixtureOflProfile | undefined,
  channelIndex: number,
): FixtureChannelKind {
  return fixtureChannelAt(profile, channelIndex)?.kind ?? "generic";
}

export function isFineChannel(
  profile: FixtureOflProfile | undefined,
  channelIndex: number,
): boolean {
  const channel = fixtureChannelAt(profile, channelIndex);
  return channel?.coarseIndex !== undefined;
}

export function isCoarseWithFine(
  profile: FixtureOflProfile | undefined,
  channelIndex: number,
): boolean {
  const channel = fixtureChannelAt(profile, channelIndex);
  return channel?.fineIndex !== undefined;
}

export function findChannelsByKind(
  profile: FixtureOflProfile | undefined,
  kind: FixtureChannelKind | FixtureChannelKind[],
): number[] {
  const kinds = new Set(Array.isArray(kind) ? kind : [kind]);
  return fixtureOflChannels(profile)
    .map((channel, index) => (kinds.has(channel.kind) ? index : -1))
    .filter((index) => index >= 0);
}

export function findFirstChannelByKind(
  profile: FixtureOflProfile | undefined,
  kind: FixtureChannelKind | FixtureChannelKind[],
): number | undefined {
  const index = findChannelsByKind(profile, kind)[0];
  return index !== undefined ? index : undefined;
}

export function fixtureHasRgbChannels(profile: FixtureOflProfile | undefined): boolean {
  const kinds = new Set(fixtureOflChannels(profile).map((channel) => channel.kind));
  return kinds.has("red") && kinds.has("green") && kinds.has("blue");
}

export function fixtureHasColorChannels(profile: FixtureOflProfile | undefined): boolean {
  return fixtureOflChannels(profile).some((channel) => COLOR_KINDS.has(channel.kind));
}

export function fixtureIsMovingHead(fixture: Fixture): boolean {
  if (fixture.ofl?.categories?.includes("Moving Head")) return true;
  const kinds = new Set(fixtureOflChannels(fixture.ofl).map((channel) => channel.kind));
  return kinds.has("pan") && kinds.has("tilt");
}

export function fixtureCategories(profile: FixtureOflProfile | undefined): string[] {
  return profile?.categories ?? [];
}

export function isRgbKind(kind: FixtureChannelKind): boolean {
  return RGB_KINDS.has(kind);
}
