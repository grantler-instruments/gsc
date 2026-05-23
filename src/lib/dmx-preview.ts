import type { Cue } from "../types/cue";
import type { Fixture } from "../types/fixture";
import { isLightFadeReady } from "./fade";
import {
  applyDmxCueToBuffers,
  getDmxUniverseFrame,
  resetDmxOutputBuffers,
} from "./dmx";

export function isDmxPreviewableCue(cue: Cue, fixtures: Fixture[]): boolean {
  if (cue.type === "dmx") return Boolean(cue.dmx);
  if (cue.type === "lightFade") return isLightFadeReady(cue, fixtures);
  return false;
}

export function listDmxPreviewCues(
  cues: Cue[],
  previewCueIds: readonly string[],
  fixtures: Fixture[],
): Cue[] {
  const previewSet = new Set(previewCueIds);
  return cues.filter(
    (cue) => previewSet.has(cue.id) && isDmxPreviewableCue(cue, fixtures),
  );
}

function fixtureUniverses(fixtures: Fixture[]): number[] {
  return [...new Set(fixtures.map((fixture) => fixture.universe))].sort(
    (a, b) => a - b,
  );
}

export function buildDmxPreviewFrames(
  cues: Cue[],
  previewCueIds: readonly string[],
  fixtures: Fixture[],
) {
  resetDmxOutputBuffers();

  for (const cue of listDmxPreviewCues(cues, previewCueIds, fixtures)) {
    if (!cue.dmx) continue;
    applyDmxCueToBuffers(cue.dmx, fixtures);
  }

  return fixtureUniverses(fixtures).map((universe) =>
    getDmxUniverseFrame(universe),
  );
}
