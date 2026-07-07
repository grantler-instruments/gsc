import { useMemo } from "react";
import { getPrimarySelectedCueId } from "../lib/cue-selection";
import { getFadeTarget } from "../lib/cues";
import { addDmxFixtureToCue, resolveLightFadeDmx, updateDmxFixtureChannelValues } from "../lib/dmx";
import type { FixturePositionDegrees } from "../lib/fixture-position";
import {
  detectFixturePositionAxesFromFixture,
  writeFixturePositionDegrees,
} from "../lib/fixture-position";
import { useActiveCueList, useProjectStore } from "../stores/project";
import type { Cue, DmxCueData } from "../types/cue";
import type { Fixture } from "../types/fixture";

export interface ActiveLightCueContext {
  cue: Cue | null;
  editable: boolean;
  referencedFade: boolean;
  dmx: DmxCueData | null;
  fixtureIdsInCue: Set<string>;
}

function resolveActiveLightCue(
  cue: Cue | undefined,
  cues: Cue[],
  fixtures: Fixture[],
): ActiveLightCueContext {
  if (!cue || (cue.type !== "dmx" && cue.type !== "lightFade") || !cue.dmx) {
    return {
      cue: cue ?? null,
      editable: false,
      referencedFade: false,
      dmx: null,
      fixtureIdsInCue: new Set(),
    };
  }

  const referenceTarget = cue.type === "lightFade" ? getFadeTarget(cue, cues) : undefined;
  const referencedFade = cue.type === "lightFade" && Boolean(referenceTarget?.dmx);
  const dmx =
    referencedFade && referenceTarget?.dmx
      ? resolveLightFadeDmx(cue.dmx, referenceTarget.dmx, fixtures)
      : cue.dmx;

  return {
    cue,
    editable: !referencedFade,
    referencedFade,
    dmx,
    fixtureIdsInCue: new Set(dmx.fixtures.map((entry) => entry.fixtureId)),
  };
}

export function useActiveLightCueContext(): ActiveLightCueContext {
  const activeList = useActiveCueList();
  const fixtures = useProjectStore((s) => s.fixtures);
  const selectedCueId = getPrimarySelectedCueId(activeList.selectedCueIds);
  const cue = activeList.cues.find((item) => item.id === selectedCueId);

  return useMemo(
    () => resolveActiveLightCue(cue, activeList.cues, fixtures),
    [activeList.cues, cue, fixtures],
  );
}

export function patchActiveLightCueFixturePosition(
  context: ActiveLightCueContext,
  fixture: Fixture,
  position: FixturePositionDegrees,
): DmxCueData | null {
  if (!context.cue?.dmx || !context.editable) return null;
  const axes = detectFixturePositionAxesFromFixture(fixture);
  if (!axes) return null;
  const updates = writeFixturePositionDegrees(axes, position);
  return updateDmxFixtureChannelValues(context.cue.dmx, fixture.id, updates);
}

export function ensureFixtureInActiveLightCue(
  context: ActiveLightCueContext,
  fixture: Fixture,
): DmxCueData | null {
  if (!context.cue?.dmx || !context.editable) return null;
  if (context.fixtureIdsInCue.has(fixture.id)) return context.cue.dmx;
  return addDmxFixtureToCue(context.cue.dmx, fixture);
}
