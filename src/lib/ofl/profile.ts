import type { FixtureOflProfile } from "../../types/fixture";
import { normalizePath } from "../../vfs/engine";
import type { OflFixtureSummary, OflModeSummary } from "./types";

export function buildFixtureOflProfile(
  filePath: string,
  summary: OflFixtureSummary,
  mode: OflModeSummary,
): FixtureOflProfile {
  return {
    filePath,
    manufacturerKey: summary.manufacturerKey,
    manufacturer: summary.manufacturer,
    fixtureKey: summary.fixtureKey,
    model: summary.name,
    modeName: mode.name,
    channels: mode.channels.map((channel) => ({
      key: channel.key,
    })),
  };
}

export function normalizeFixtureOflProfile(
  raw: Partial<FixtureOflProfile> & Pick<FixtureOflProfile, "filePath">,
): FixtureOflProfile {
  return {
    filePath: normalizePath(raw.filePath),
    manufacturerKey: raw.manufacturerKey?.trim() || "unknown",
    manufacturer: raw.manufacturer?.trim() || "Unknown",
    fixtureKey: raw.fixtureKey?.trim() || "fixture",
    model: raw.model?.trim() || "Fixture",
    modeName: raw.modeName?.trim() || "Unnamed mode",
    channels: (raw.channels ?? []).map((channel) => ({
      key: channel.key?.trim() || "Unknown",
    })),
  };
}

export function oflProfileChannelCount(profile: FixtureOflProfile): number {
  return Math.max(profile.channels.length, 1);
}

export function formatFixtureOflLabel(profile: FixtureOflProfile): string {
  return `${profile.manufacturer} ${profile.model} · ${profile.modeName}`;
}
