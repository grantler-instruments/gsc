import { createCueList, type CueList } from "./cue-lists";
import { defaultMidiCueData } from "./midi";
import type { Cue, ProjectSnapshot, ProjectSnapshotV2 } from "../types/cue";

function projectIdFromSnapshot(snap: ProjectSnapshot): string {
  if (snap.version === 2 && snap.id) return snap.id;
  return crypto.randomUUID();
}

function normalizeCues(cues: Cue[]): Cue[] {
  return cues.map((c) =>
    c.type === "midi" && !c.midi ? { ...c, midi: defaultMidiCueData() } : c,
  );
}

export function snapshotToCueLists(snap: ProjectSnapshot): {
  id: string;
  name: string;
  cueLists: CueList[];
  activeCueListId: string;
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
    };
  }

  const main = createCueList("Main");
  main.cues = normalizeCues(snap.cues);
  if (main.cues[0]) {
    main.selectedCueIds = [main.cues[0].id];
    main.selectionAnchorId = main.cues[0].id;
  }
  return { id, name: snap.name, cueLists: [main], activeCueListId: main.id };
}

export function cueListsToSnapshot(
  id: string,
  name: string,
  cueLists: CueList[],
  activeCueListId: string,
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
  };
}
