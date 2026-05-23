import type { Cue } from "../types/cue";
import type { Fixture } from "../types/fixture";
import { applyDmxCueToBuffers, getDmxUniverseFrame, resetDmxOutputBuffers } from "./dmx";
import { isLightFadeReady, resolveLightFadeEndDmx } from "./fade";

export function isDmxPreviewableCue(cue: Cue, fixtures: Fixture[], cues: Cue[] = []): boolean {
  if (cue.type === "dmx") return Boolean(cue.dmx);
  if (cue.type === "lightFade") return isLightFadeReady(cue, fixtures, cues);
  return false;
}

export function listDmxPreviewCues(
  cues: Cue[],
  previewCueIds: readonly string[],
  fixtures: Fixture[],
): Cue[] {
  const previewSet = new Set(previewCueIds);
  return cues.filter((cue) => previewSet.has(cue.id) && isDmxPreviewableCue(cue, fixtures, cues));
}

function fixtureUniverses(fixtures: Fixture[]): number[] {
  return [...new Set(fixtures.map((fixture) => fixture.universe))].sort((a, b) => a - b);
}

export function buildDmxPreviewFrames(
  cues: Cue[],
  previewCueIds: readonly string[],
  fixtures: Fixture[],
) {
  resetDmxOutputBuffers();

  for (const cue of listDmxPreviewCues(cues, previewCueIds, fixtures)) {
    if (cue.type === "dmx" && cue.dmx) {
      applyDmxCueToBuffers(cue.dmx, fixtures);
      continue;
    }
    if (cue.type === "lightFade") {
      const endDmx = resolveLightFadeEndDmx(cue, cues, fixtures);
      if (endDmx) applyDmxCueToBuffers(endDmx, fixtures);
    }
  }

  return fixtureUniverses(fixtures).map((universe) => getDmxUniverseFrame(universe));
}
