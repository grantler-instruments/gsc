import { t } from "../i18n/t";
import type { Cue, CueListKind } from "../types/cue";
import { randomId } from "./random-id";

export interface CueList {
  id: string;
  name: string;
  /** Defaults to "sequence" when absent. Always set by createCueList / snapshot load. */
  kind?: CueListKind;
  cues: Cue[];
  selectedCueIds: string[];
  selectionAnchorId: string | null;
}

export function createCueList(name: string, kind: CueListKind = "sequence"): CueList {
  return {
    id: randomId(),
    name,
    kind,
    cues: [],
    selectedCueIds: [],
    selectionAnchorId: null,
  };
}

export function isHotCueList(list: Pick<CueList, "kind">): boolean {
  return list.kind === "hot";
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

export function nextCueListName(cueLists: CueList[], kind: CueListKind = "sequence"): string {
  const used = new Set(cueLists.map((l) => l.name));
  const key = kind === "hot" ? "project.generatedHotListName" : "project.generatedListName";
  let n = cueLists.length + 1;
  let name = t(key, { number: n });
  while (used.has(name)) {
    n += 1;
    name = t(key, { number: n });
  }
  return name;
}
