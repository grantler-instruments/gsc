import { getChildCues, isContainerCue, renumberCueList } from "./cues";
import type { Cue } from "../types/cue";

let clipboard: Cue[] | null = null;

function cloneCueFields(cue: Cue): Cue {
  return {
    ...cue,
    midi: cue.midi ? { ...cue.midi } : undefined,
  };
}

export function getCueClipboard(): Cue[] | null {
  return clipboard;
}

export function setCueClipboard(cues: Cue[]): void {
  clipboard = cues.map(cloneCueFields);
}

export function hasCueClipboard(): boolean {
  return !!clipboard?.length;
}

/** Selected roots plus any nested children (containers bring their subtree). */
export function collectCuesForCopy(selectedIds: string[], cues: Cue[]): Cue[] {
  if (selectedIds.length === 0) return [];

  const selectedSet = new Set(selectedIds);
  const rootIds = selectedIds.filter((id) => {
    const cue = cues.find((c) => c.id === id);
    if (!cue) return false;
    return !cue.parentId || !selectedSet.has(cue.parentId);
  });

  const include = new Set<string>();

  const markSubtree = (id: string) => {
    include.add(id);
    const cue = cues.find((c) => c.id === id);
    if (cue && isContainerCue(cue)) {
      for (const child of getChildCues(cues, id)) {
        markSubtree(child.id);
      }
    }
  };

  for (const id of rootIds) markSubtree(id);

  return cues.filter((c) => include.has(c.id)).map(cloneCueFields);
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

export interface PastePreparedCues {
  cues: Cue[];
  selectedCueIds: string[];
}

/** Clone clipboard cues with new ids, ready to insert after the anchor cue. */
export function prepareCuePaste(
  source: Cue[],
  cues: Cue[],
  anchorCueId: string | null,
): PastePreparedCues | null {
  if (source.length === 0) return null;

  const sourceSet = new Set(source.map((c) => c.id));
  const roots = source.filter(
    (c) => !c.parentId || !sourceSet.has(c.parentId),
  );
  const idMap = new Map(source.map((c) => [c.id, crypto.randomUUID()]));

  const pasteParentId = anchorCueId
    ? cues.find((c) => c.id === anchorCueId)?.parentId
    : undefined;

  const rootOldIds = new Set(roots.map((c) => c.id));
  const clones = source.map((c) => ({
    ...cloneCueFields(c),
    id: idMap.get(c.id)!,
    number: "0",
    parentId: rootOldIds.has(c.id)
      ? pasteParentId
      : c.parentId
        ? idMap.get(c.parentId)
        : undefined,
    stopTargetId:
      c.stopTargetId && idMap.has(c.stopTargetId)
        ? idMap.get(c.stopTargetId)
        : c.stopTargetId,
    fadeTargetId:
      c.fadeTargetId && idMap.has(c.fadeTargetId)
        ? idMap.get(c.fadeTargetId)
        : c.fadeTargetId,
  }));

  const insertAt = anchorCueId
    ? indexAfterCueSubtree(cues, anchorCueId)
    : cues.length;

  return {
    cues: renumberCueList([...cues.slice(0, insertAt), ...clones, ...cues.slice(insertAt)]),
    selectedCueIds: clones.map((c) => c.id),
  };
}
