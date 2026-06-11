import type { CueList } from "./cue-lists";
import { findCueInLists } from "./cue-lists";
import type { Cue } from "../types/cue";
import {
  getChildCues,
  isContainerCue,
  isFadeCue,
  isStopCue,
  renumberCueList,
} from "./cues";

export type CueListInsertPlace =
  | { kind: "append" }
  | { kind: "before"; cueId: string }
  | { kind: "after"; cueId: string }
  | { kind: "into-group"; groupId: string };

/** Cue ids in a subtree rooted at `rootId` (includes the root). */
export function collectCueSubtreeIds(cues: Cue[], rootId: string): Set<string> {
  const include = new Set<string>();
  const walk = (id: string) => {
    include.add(id);
    const cue = cues.find((c) => c.id === id);
    if (cue && isContainerCue(cue)) {
      for (const child of getChildCues(cues, id)) {
        walk(child.id);
      }
    }
  };
  walk(rootId);
  return include;
}

function indexAfterCueSubtree(cues: Cue[], cueId: string): number {
  const indices: number[] = [];
  const walk = (id: string) => {
    cues.forEach((c, i) => {
      if (c.id === id) indices.push(i);
    });
    for (const child of getChildCues(cues, id)) {
      walk(child.id);
    }
  };
  walk(cueId);
  if (indices.length === 0) return cues.length;
  return Math.max(...indices) + 1;
}

/** Remove a cue subtree and any stop/fade cues that reference removed ids. */
export function removeCueSubtreeFromList(cues: Cue[], rootId: string): Cue[] {
  const toRemove = collectCueSubtreeIds(cues, rootId);
  for (const c of cues) {
    if (isStopCue(c) && c.stopTargetId && toRemove.has(c.stopTargetId)) {
      toRemove.add(c.id);
    }
    if (isFadeCue(c) && c.fadeTargetId && toRemove.has(c.fadeTargetId)) {
      toRemove.add(c.id);
    }
  }
  return cues.filter((c) => !toRemove.has(c.id));
}

function prepareMovedSubtree(subtree: Cue[], rootParentId: string | undefined): Cue[] {
  const subtreeIds = new Set(subtree.map((c) => c.id));
  const rootIds = new Set(
    subtree.filter((c) => !c.parentId || !subtreeIds.has(c.parentId)).map((c) => c.id),
  );
  return subtree.map((c) =>
    rootIds.has(c.id) ? { ...c, parentId: rootParentId } : { ...c },
  );
}

function insertIndexForPlace(cues: Cue[], place: CueListInsertPlace): number {
  if (place.kind === "append") return cues.length;
  if (place.kind === "into-group") {
    const children = getChildCues(cues, place.groupId);
    const lastChild = children[children.length - 1];
    return lastChild ? indexAfterCueSubtree(cues, lastChild.id) : cues.length;
  }
  if (place.kind === "before") {
    const idx = cues.findIndex((c) => c.id === place.cueId);
    return idx === -1 ? cues.length : idx;
  }
  return indexAfterCueSubtree(cues, place.cueId);
}

function rootParentIdForPlace(
  targetList: CueList,
  place: CueListInsertPlace,
): string | undefined {
  if (targetList.kind === "hot") return undefined;
  if (place.kind === "into-group") return place.groupId;
  if (place.kind === "append") return undefined;
  const ref = targetList.cues.find((c) => c.id === place.cueId);
  return ref?.parentId;
}

export function insertCueSubtree(
  cues: Cue[],
  subtree: Cue[],
  place: CueListInsertPlace,
  rootParentId: string | undefined,
): Cue[] {
  const moved = prepareMovedSubtree(subtree, rootParentId);
  const insertAt = insertIndexForPlace(cues, place);
  return renumberCueList([...cues.slice(0, insertAt), ...moved, ...cues.slice(insertAt)]);
}

export interface MoveCueBetweenListsResult {
  cueLists: CueList[];
  movedRootId: string;
}

/** Move a cue subtree from one list to another. Returns null when invalid or same list. */
export function moveCueBetweenLists(
  cueLists: CueList[],
  cueId: string,
  targetListId: string,
  place: CueListInsertPlace,
): MoveCueBetweenListsResult | null {
  const found = findCueInLists(cueLists, cueId);
  if (!found) return null;
  const { list: sourceList } = found;
  if (sourceList.id === targetListId) return null;

  const targetList = cueLists.find((l) => l.id === targetListId);
  if (!targetList) return null;

  const subtreeIds = collectCueSubtreeIds(sourceList.cues, cueId);
  const subtree = sourceList.cues.filter((c) => subtreeIds.has(c.id));
  const rootParentId = rootParentIdForPlace(targetList, place);

  const sourceCues = renumberCueList(removeCueSubtreeFromList(sourceList.cues, cueId));
  const targetCues = insertCueSubtree(targetList.cues, subtree, place, rootParentId);

  const pruneSelection = (list: CueList, cues: Cue[]): Partial<CueList> => {
    const cueIds = new Set(cues.map((c) => c.id));
    const selectedCueIds = list.selectedCueIds.filter((id) => cueIds.has(id));
    const selectionAnchorId =
      list.selectionAnchorId && cueIds.has(list.selectionAnchorId)
        ? list.selectionAnchorId
        : (selectedCueIds[0] ?? null);
    return { cues, selectedCueIds, selectionAnchorId };
  };

  const nextLists = cueLists.map((list) => {
    if (list.id === sourceList.id) {
      return { ...list, ...pruneSelection(list, sourceCues) };
    }
    if (list.id === targetListId) {
      return {
        ...list,
        ...pruneSelection(list, targetCues),
        selectedCueIds: [cueId],
        selectionAnchorId: cueId,
      };
    }
    return list;
  });

  return { cueLists: nextLists, movedRootId: cueId };
}
