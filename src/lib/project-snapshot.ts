import type { AudioBus } from "../types/audio-bus";
import type { Cue, ProjectSnapshot } from "../types/cue";
import type { Fixture } from "../types/fixture";
import type { FixturePlot } from "../types/fixture-plot";
import type { MidiMapping } from "../types/midi-mapping";
import type { VideoBus } from "../types/video-bus";
import type { VideoEffect } from "../types/video-effect";
import { normalizeAudioBuses, normalizeCueAudioBus } from "./audio-buses";
import type { CueList } from "./cue-lists";
import { defaultDmxCueData, normalizeDmxCueData } from "./dmx";
import { normalizeFixturePlot } from "./fixture-plot";
import { normalizeFixtures } from "./fixtures";
import { defaultMidiCueData } from "./midi";
import { defaultOscCueData, normalizeOscArgs } from "./osc";
import {
  masterVideoOutputEffectiveOpacity,
  normalizeCueVideoBus,
  normalizeMasterVideoOutputName,
  normalizeVideoBuses,
  serializeMasterVideoOutputName,
} from "./video-buses";
import { normalizeVideoEffects } from "./video-effects";

function normalizeCues(
  cues: Cue[],
  fixtures: Fixture[] = [],
  audioBuses: AudioBus[] = [],
  videoBuses: VideoBus[] = [],
): Cue[] {
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
    return normalizeCueVideoBus(normalizeCueAudioBus(next, audioBuses), videoBuses);
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
  videoBuses: VideoBus[];
  masterVideoOutputName: string;
  masterVideoOutputOpacity: number;
  masterVideoOutputEffects?: VideoEffect[];
} {
  const fixtures = normalizeFixtures(snap.fixtures);
  const fixturePlot = normalizeFixturePlot(snap.fixturePlot, fixtures);
  const audioBuses = normalizeAudioBuses(snap.audioBuses);
  const videoBuses = normalizeVideoBuses(snap.videoBuses);
  const masterVideoOutputEffects = normalizeVideoEffects(snap.masterVideoOutputEffects);
  const cueLists: CueList[] = snap.cueLists.map((list) => ({
    id: list.id,
    name: list.name,
    cues: normalizeCues(list.cues, fixtures, audioBuses, videoBuses),
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
    videoBuses,
    masterVideoOutputName: normalizeMasterVideoOutputName(snap.masterVideoOutputName),
    masterVideoOutputOpacity: masterVideoOutputEffectiveOpacity(snap.masterVideoOutputOpacity),
    ...(masterVideoOutputEffects.length > 0 ? { masterVideoOutputEffects } : {}),
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
  videoBuses: VideoBus[] = [],
  masterVideoOutputName?: string,
  masterVideoOutputOpacity?: number,
  masterVideoOutputEffects?: VideoEffect[],
): ProjectSnapshot {
  const normalizedFixtures = normalizeFixtures(fixtures);
  const normalizedMasterName = normalizeMasterVideoOutputName(masterVideoOutputName);
  const serializedMasterName = serializeMasterVideoOutputName(normalizedMasterName);
  const normalizedMasterOpacity = masterVideoOutputEffectiveOpacity(masterVideoOutputOpacity);
  const normalizedMasterEffects = normalizeVideoEffects(masterVideoOutputEffects);
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
    ...(videoBuses.length > 0 ? { videoBuses: normalizeVideoBuses(videoBuses) } : {}),
    ...(serializedMasterName ? { masterVideoOutputName: serializedMasterName } : {}),
    ...(normalizedMasterOpacity < 1 ? { masterVideoOutputOpacity: normalizedMasterOpacity } : {}),
    ...(normalizedMasterEffects.length > 0
      ? { masterVideoOutputEffects: normalizedMasterEffects }
      : {}),
  };
}
