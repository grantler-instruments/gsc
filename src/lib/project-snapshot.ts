import type { AudioBus } from "../types/audio-bus";
import type { Cue, ProjectSnapshot } from "../types/cue";
import type { Fixture } from "../types/fixture";
import type { FixturePlot } from "../types/fixture-plot";
import type { MidiMapping } from "../types/midi-mapping";
import { normalizeAudioBuses, normalizeCueAudioBus } from "./audio-buses";
import type { CueList } from "./cue-lists";
import { initialCueListSelection } from "./cue-selection";
import { defaultDmxCueData, normalizeDmxCueData } from "./dmx";
import { normalizeFixturePlot } from "./fixture-plot";
import { normalizeFixtures } from "./fixtures";
import { defaultMidiCueData } from "./midi";
import { defaultOscCueData, normalizeOscArgs } from "./osc";

function normalizeCues(cues: Cue[], fixtures: Fixture[] = [], audioBuses: AudioBus[] = []): Cue[] {
  return cues.map((c) => {
    let next = c;
    if (c.type === "midi" && !c.midi) {
      next = { ...next, midi: defaultMidiCueData() };
    }
    if (next.type === "osc" && !next.osc) {
      next = { ...next, osc: defaultOscCueData() };
    }
    if (next.type === "osc" && next.osc) {
      next = { ...next, osc: { ...next.osc, args: normalizeOscArgs(next.osc.args) } };
    }
    if (next.type === "dmx" && !next.dmx) {
      next = { ...next, dmx: defaultDmxCueData(fixtures) };
    }
    if (next.type === "dmx" && next.dmx) {
      next = { ...next, dmx: normalizeDmxCueData(next.dmx, fixtures) };
    }
    if (next.type === "lightFade" && !next.dmx) {
      next = { ...next, dmx: defaultDmxCueData(fixtures) };
    }
    if (next.type === "lightFade" && next.dmx) {
      next = { ...next, dmx: normalizeDmxCueData(next.dmx, fixtures) };
    }
    return normalizeCueAudioBus(next, audioBuses);
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
  const cueLists: CueList[] = snap.cueLists.map((list, index) => {
    const cues = normalizeCues(list.cues, fixtures, audioBuses);
    const selection =
      index === 0 ? initialCueListSelection(cues) : { selectedCueIds: [], selectionAnchorId: null };
    return {
      id: list.id,
      name: list.name,
      cues,
      ...selection,
    };
  });
  const firstList = cueLists[0];
  return {
    id: snap.id,
    name: snap.name,
    startDate: snap.startDate ?? snap.date,
    endDate: snap.endDate,
    description: snap.description,
    cueLists,
    activeCueListId: firstList?.id ?? snap.activeCueListId,
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
