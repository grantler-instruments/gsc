import type { AudioBus } from "../types/audio-bus";
import type { Cue, ProjectSnapshot } from "../types/cue";
import type { Fixture } from "../types/fixture";
import type { FixturePlot } from "../types/fixture-plot";
import type { MidiMapping } from "../types/midi-mapping";
import { normalizeAudioBuses } from "./audio-buses";
import type { CueList } from "./cue-lists";
import { defaultDmxCueData, normalizeDmxCueData } from "./dmx";
import { normalizeFixturePlot } from "./fixture-plot";
import { normalizeFixtures } from "./fixtures";
import { defaultMidiCueData } from "./midi";
import { defaultOscCueData, normalizeOscArgs } from "./osc";

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
  startDate?: string;
  endDate?: string;
  description?: string;
  cueLists: CueList[];
  activeCueListId: string;
  midiMappings: MidiMapping[];
  fixtures: Fixture[];
  fixturePlot: FixturePlot;
  audioBuses: AudioBus[];
} {
  const fixtures = normalizeFixtures(snap.fixtures);
  const fixturePlot = normalizeFixturePlot(snap.fixturePlot, fixtures);
  const audioBuses = normalizeAudioBuses(snap.audioBuses);
  const cueLists: CueList[] = snap.cueLists.map((list) => ({
    id: list.id,
    name: list.name,
    cues: normalizeCues(list.cues, fixtures),
    selectedCueIds: [],
    selectionAnchorId: null,
  }));
  const active = cueLists.find((l) => l.id === snap.activeCueListId) ?? cueLists[0];
  return {
    id: snap.id,
    name: snap.name,
    startDate: snap.startDate ?? snap.date,
    endDate: snap.endDate,
    description: snap.description,
    cueLists,
    activeCueListId: active?.id ?? snap.activeCueListId,
    midiMappings: snap.midiMappings ?? [],
    fixtures,
    fixturePlot,
    audioBuses,
  };
}

export function cueListsToSnapshot(
  id: string,
  name: string,
  cueLists: CueList[],
  activeCueListId: string,
  midiMappings: MidiMapping[] = [],
  fixtures: Fixture[] = [],
  fixturePlot?: FixturePlot,
  audioBuses: AudioBus[] = [],
  startDate?: string,
  endDate?: string,
  description?: string,
): ProjectSnapshot {
  const normalizedFixtures = normalizeFixtures(fixtures);
  return {
    version: 2,
    id,
    name,
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(description ? { description } : {}),
    activeCueListId,
    cueLists: cueLists.map((list) => ({
      id: list.id,
      name: list.name,
      cues: list.cues,
    })),
    midiMappings,
    fixtures: normalizedFixtures,
    fixturePlot: normalizeFixturePlot(fixturePlot, normalizedFixtures),
    ...(audioBuses.length > 0 ? { audioBuses: normalizeAudioBuses(audioBuses) } : {}),
  };
}
