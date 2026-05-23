import { type CueList } from "./cue-lists";
import { normalizeFixtures } from "./fixtures";
import { defaultMidiCueData } from "./midi";
import { defaultOscCueData, normalizeOscArgs } from "./osc";
import { defaultDmxCueData, normalizeDmxCueData } from "./dmx";
import type { Cue, ProjectSnapshot } from "../types/cue";
import type { Fixture } from "../types/fixture";
import type { MidiMapping } from "../types/midi-mapping";

function normalizeCues(cues: Cue[], fixtures: Fixture[] = []): Cue[] {
  return cues.map((c) => {
    if (c.type === "midi" && !c.midi) {
      return { ...c, midi: defaultMidiCueData() };
    }
    if (c.type === "osc" && !c.osc) {
      return { ...c, osc: defaultOscCueData() };
    }
    if (c.type === "osc" && c.osc) {
      return { ...c, osc: { ...c.osc, args: normalizeOscArgs(c.osc.args) } };
    }
    if (c.type === "dmx" && !c.dmx) {
      return { ...c, dmx: defaultDmxCueData(fixtures) };
    }
    if (c.type === "dmx" && c.dmx) {
      return { ...c, dmx: normalizeDmxCueData(c.dmx, fixtures) };
    }
    if (c.type === "lightFade" && !c.dmx) {
      return { ...c, dmx: defaultDmxCueData(fixtures) };
    }
    if (c.type === "lightFade" && c.dmx) {
      return { ...c, dmx: normalizeDmxCueData(c.dmx, fixtures) };
    }
    return c;
  });
}

export function snapshotToCueLists(snap: ProjectSnapshot): {
  id: string;
  name: string;
  cueLists: CueList[];
  activeCueListId: string;
  midiMappings: MidiMapping[];
  fixtures: Fixture[];
} {
  const fixtures = normalizeFixtures(snap.fixtures);
  const cueLists: CueList[] = snap.cueLists.map((list) => ({
    id: list.id,
    name: list.name,
    cues: normalizeCues(list.cues, fixtures),
    selectedCueIds: [],
    selectionAnchorId: null,
  }));
  const active =
    cueLists.find((l) => l.id === snap.activeCueListId) ?? cueLists[0];
  return {
    id: snap.id,
    name: snap.name,
    cueLists,
    activeCueListId: active.id,
    midiMappings: snap.midiMappings ?? [],
    fixtures,
  };
}

export function cueListsToSnapshot(
  id: string,
  name: string,
  cueLists: CueList[],
  activeCueListId: string,
  midiMappings: MidiMapping[] = [],
  fixtures: Fixture[] = [],
): ProjectSnapshot {
  return {
    version: 2,
    id,
    name,
    activeCueListId,
    cueLists: cueLists.map((list) => ({
      id: list.id,
      name: list.name,
      cues: list.cues,
    })),
    midiMappings,
    fixtures,
  };
}
