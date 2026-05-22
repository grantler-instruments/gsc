import { createCueList, type CueList } from "./cue-lists";
import { defaultMidiCueData } from "./midi";
import { defaultOscCueData, normalizeOscArgs } from "./osc";
import type { Cue, ProjectSnapshot, ProjectSnapshotV2 } from "../types/cue";
import type { MidiMapping } from "../types/midi-mapping";

function projectIdFromSnapshot(snap: ProjectSnapshot): string {
  if (snap.version === 2 && snap.id) return snap.id;
  return crypto.randomUUID();
}

function normalizeCues(cues: Cue[]): Cue[] {
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
    return c;
  });
}

export function snapshotToCueLists(snap: ProjectSnapshot): {
  id: string;
  name: string;
  cueLists: CueList[];
  activeCueListId: string;
  midiMappings: MidiMapping[];
} {
  const id = projectIdFromSnapshot(snap);

  if (snap.version === 2) {
    const cueLists: CueList[] = snap.cueLists.map((list) => ({
      id: list.id,
      name: list.name,
      cues: normalizeCues(list.cues),
      selectedCueIds: [],
      selectionAnchorId: null,
    }));
    const active =
      cueLists.find((l) => l.id === snap.activeCueListId) ?? cueLists[0];
    return {
      id,
      name: snap.name,
      cueLists,
      activeCueListId: active.id,
      midiMappings: snap.midiMappings ?? [],
    };
  }

  const main = createCueList("Main");
  main.cues = normalizeCues(snap.cues);
  if (main.cues[0]) {
    main.selectedCueIds = [main.cues[0].id];
    main.selectionAnchorId = main.cues[0].id;
  }
  return {
    id,
    name: snap.name,
    cueLists: [main],
    activeCueListId: main.id,
    midiMappings: [],
  };
}

export function cueListsToSnapshot(
  id: string,
  name: string,
  cueLists: CueList[],
  activeCueListId: string,
  midiMappings: MidiMapping[] = [],
): ProjectSnapshotV2 {
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
  };
}
