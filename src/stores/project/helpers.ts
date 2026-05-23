import type { CueList } from "../../lib/cue-lists";
import { renumberCueList } from "../../lib/cues";
import type { Cue, CueType } from "../../types/cue";

export function isMediaCueType(type: CueType): boolean {
  return type === "audio" || type === "video" || type === "image";
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
