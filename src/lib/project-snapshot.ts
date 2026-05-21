import { createCueList, type CueList } from "./cue-lists";
import { defaultMidiCueData } from "./midi";
import type { Cue, ProjectSnapshot, ProjectSnapshotV2 } from "../types/cue";

function normalizeCues(cues: Cue[]): Cue[] {
  return cues.map((c) =>
    c.type === "midi" && !c.midi ? { ...c, midi: defaultMidiCueData() } : c,
  );
}

export function snapshotToCueLists(snap: ProjectSnapshot): {
  name: string;
  cueLists: CueList[];
  activeCueListId: string;
} {
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
      name: snap.name,
      cueLists,
      activeCueListId: active.id,
    };
  }

  const main = createCueList("Main");
  main.cues = normalizeCues(snap.cues);
  if (main.cues[0]) {
    main.selectedCueIds = [main.cues[0].id];
    main.selectionAnchorId = main.cues[0].id;
  }
  return { name: snap.name, cueLists: [main], activeCueListId: main.id };
}

export function cueListsToSnapshot(
  name: string,
  cueLists: CueList[],
  activeCueListId: string,
): ProjectSnapshotV2 {
  return {
    version: 2,
    name,
    activeCueListId,
    cueLists: cueLists.map((list) => ({
      id: list.id,
      name: list.name,
      cues: list.cues,
    })),
  };
}
