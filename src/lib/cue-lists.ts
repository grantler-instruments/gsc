import type { Cue } from "../types/cue";

export interface CueList {
  id: string;
  name: string;
  cues: Cue[];
  selectedCueIds: string[];
  selectionAnchorId: string | null;
}

export function createCueList(name: string): CueList {
  return {
    id: crypto.randomUUID(),
    name,
    cues: [],
    selectedCueIds: [],
    selectionAnchorId: null,
  };
}

export function findCueInLists(
  cueLists: CueList[],
  cueId: string,
): { cue: Cue; list: CueList } | null {
  for (const list of cueLists) {
    const cue = list.cues.find((c) => c.id === cueId);
    if (cue) return { cue, list };
  }
  return null;
}

export function nextCueListName(cueLists: CueList[]): string {
  const used = new Set(cueLists.map((l) => l.name));
  let n = cueLists.length + 1;
  let name = `List ${n}`;
  while (used.has(name)) {
    n += 1;
    name = `List ${n}`;
  }
  return name;
}
