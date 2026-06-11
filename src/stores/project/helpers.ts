import type { CueList } from "../../lib/cue-lists";
import { renumberCueList } from "../../lib/cues";
import type { Cue, CueType } from "../../types/cue";

export function isMediaCueType(type: CueType): boolean {
  return type === "audio" || type === "video" || type === "image";
}

export function isVisualCueType(type: CueType): boolean {
  return type === "video" || type === "image";
}

export function applyRenumber(cues: Cue[]): Cue[] {
  return renumberCueList(cues);
}

export function getActiveCueListFromState(state: {
  cueLists: CueList[];
  activeCueListId: string;
}): CueList {
  return state.cueLists.find((l) => l.id === state.activeCueListId) ?? state.cueLists[0];
}

function isHotList(list: CueList): boolean {
  return list.kind === "hot";
}

/** Resolve the sequence list for the main panel, self-healing stale ids. */
export function resolveMainSequenceListId(state: {
  cueLists: CueList[];
  mainSequenceListId: string;
}): string | null {
  const stored = state.cueLists.find((l) => l.id === state.mainSequenceListId && !isHotList(l));
  if (stored) return stored.id;
  return state.cueLists.find((l) => !isHotList(l))?.id ?? null;
}

/** Resolve the hot list for the hot-cue panel, self-healing stale ids. */
export function resolveActiveHotListId(state: {
  cueLists: CueList[];
  activeHotCueListId: string | null;
}): string | null {
  const stored = state.cueLists.find((l) => l.id === state.activeHotCueListId && isHotList(l));
  if (stored) return stored.id;
  return state.cueLists.find((l) => isHotList(l))?.id ?? null;
}

export function patchActiveList(
  state: { cueLists: CueList[]; activeCueListId: string },
  patch: (list: CueList) => Partial<CueList>,
): { cueLists: CueList[] } {
  return {
    cueLists: state.cueLists.map((list) =>
      list.id === state.activeCueListId ? { ...list, ...patch(list) } : list,
    ),
  };
}

export function firstCueOrStub(list: CueList, name: string, type: CueType): Cue {
  return list.cues[0] ?? { id: "", number: "0", name, type };
}
