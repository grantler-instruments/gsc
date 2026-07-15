import type { FixtureOflProfile } from "../../types/fixture";
import { normalizePath } from "../../vfs/engine";
import { applyOflChannelResolutions } from "../fixture-channels";
import type { OflFixtureSummary, OflModeSummary } from "./types";

export function buildFixtureOflProfile(
  filePath: string,
  summary: OflFixtureSummary,
  mode: OflModeSummary,
): FixtureOflProfile {
  const channels = applyOflChannelResolutions(
    mode.channels.map((channel) => ({
      key: channel.key,
    })),
  );
  return {
    filePath,
    manufacturerKey: summary.manufacturerKey,
    manufacturer: summary.manufacturer,
    fixtureKey: summary.fixtureKey,
    model: summary.name,
    modeName: mode.name,
    channels,
  };
}

export function normalizeFixtureOflProfile(
  raw: Partial<FixtureOflProfile> & Pick<FixtureOflProfile, "filePath">,
): FixtureOflProfile {
  const channels = applyOflChannelResolutions(
    (raw.channels ?? []).map((channel) => ({
      key: channel.key?.trim() || "Unknown",
      resolution: channel.resolution,
    })),
  );
  return {
    filePath: normalizePath(raw.filePath),
    manufacturerKey: raw.manufacturerKey?.trim() || "unknown",
    manufacturer: raw.manufacturer?.trim() || "Unknown",
    fixtureKey: raw.fixtureKey?.trim() || "fixture",
    model: raw.model?.trim() || "Fixture",
    modeName: raw.modeName?.trim() || "Unnamed mode",
    channels,
  };
}

export function oflProfileChannelCount(profile: FixtureOflProfile): number {
  return Math.max(profile.channels.length, 1);
}

export function formatFixtureOflLabel(profile: FixtureOflProfile): string {
  return `${profile.manufacturer} ${profile.model} · ${profile.modeName}`;
}
