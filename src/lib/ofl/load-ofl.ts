import type { FixtureOflProfile } from "../../types/fixture";
import { vfsGet } from "../../vfs/engine";
import { parseOflFixtureJson } from "./client";
import { buildFixtureOflProfile } from "./profile";
import type { OflFixtureSummary } from "./types";

export async function loadOflSummaryFromPath(
  path: string,
  metadata: Pick<FixtureOflProfile, "manufacturerKey" | "manufacturer" | "fixtureKey">,
): Promise<OflFixtureSummary | null> {
  const blob = vfsGet(path);
  if (!blob) return null;
  const raw = JSON.parse(await blob.text());
  return parseOflFixtureJson(
    metadata.manufacturerKey,
    metadata.manufacturer,
    metadata.fixtureKey,
    raw,
  );
}

export async function loadFixtureOflProfileForMode(
  profile: FixtureOflProfile,
  modeName: string,
): Promise<ReturnType<typeof buildFixtureOflProfile> | null> {
  const summary = await loadOflSummaryFromPath(profile.filePath, profile);
  if (!summary) return null;
  const mode = summary.modes.find((entry) => entry.name === modeName);
  if (!mode) return null;
  return buildFixtureOflProfile(profile.filePath, summary, mode);
}
