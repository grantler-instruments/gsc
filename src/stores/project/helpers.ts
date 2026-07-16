import type { CueList } from "../../lib/cue-lists";
import {
  getChildCues,
  isContainerCue,
  isFadeCue,
  isStopCue,
  renumberCueList,
} from "../../lib/cues";
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

/** Sequence list for the main cue panel and keyboard transport (not hot cues). */
export function getMainSequenceListFromState(state: {
  cueLists: CueList[];
  mainSequenceListId: string;
}): CueList | null {
  const id = resolveMainSequenceListId(state);
  if (!id) return null;
  return state.cueLists.find((l) => l.id === id) ?? null;
}

export function patchListById(
  state: { cueLists: CueList[] },
  listId: string,
  patch: (list: CueList) => Partial<CueList>,
): { cueLists: CueList[] } {
  return {
    cueLists: state.cueLists.map((list) =>
      list.id === listId ? { ...list, ...patch(list) } : list,
    ),
  };
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

/**
 * Expand a set of cue ids to remove so it also includes the descendants of any
 * container cues plus any stop/fade cues that target a removed cue.
 */
export function expandCueRemovalSet(cues: Cue[], initialIds: Iterable<string>): Set<string> {
  const toRemove = new Set<string>(initialIds);
  const collect = (cueId: string) => {
    for (const child of getChildCues(cues, cueId)) {
      if (toRemove.has(child.id)) continue;
      toRemove.add(child.id);
      if (isContainerCue(child)) collect(child.id);
    }
  };
  for (const id of [...toRemove]) {
    const target = cues.find((c) => c.id === id);
    if (target && isContainerCue(target)) collect(id);
  }
  for (const c of cues) {
    if (isStopCue(c) && c.stopTargetId && toRemove.has(c.stopTargetId)) toRemove.add(c.id);
    if (isFadeCue(c) && c.fadeTargetId && toRemove.has(c.fadeTargetId)) toRemove.add(c.id);
  }
  return toRemove;
}
