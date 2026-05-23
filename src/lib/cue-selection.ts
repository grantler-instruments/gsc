import type { Cue } from "../types/cue";
import { buildCueTree, type CueListNode, getChildCues, isContainerCue } from "./cues";

export function getPrimarySelectedCueId(selectedCueIds: string[]): string | null {
  return selectedCueIds[selectedCueIds.length - 1] ?? null;
}

/** Visible cue order in the list (respects collapsed containers). */
export function flattenVisibleCueIds(cues: Cue[], collapsedGroupIds: Set<string>): string[] {
  const tree = buildCueTree(cues);
  const ids: string[] = [];

  const walk = (nodes: CueListNode[]) => {
    for (const node of nodes) {
      ids.push(node.cue.id);
      if (
        isContainerCue(node.cue) &&
        !collapsedGroupIds.has(node.cue.id) &&
        node.children.length > 0
      ) {
        walk(node.children);
      }
    }
  };

  walk(tree);
  return ids;
}

export function isCueDescendantOf(cues: Cue[], ancestorId: string, descendantId: string): boolean {
  const walk = (parentId: string): boolean => {
    for (const child of getChildCues(cues, parentId)) {
      if (child.id === descendantId) return true;
      if (isContainerCue(child) && walk(child.id)) return true;
    }
    return false;
  };
  return walk(ancestorId);
}

export function canGroupSelectedCues(
  selectedIds: string[],
  cues: Cue[],
): { ok: true; parentId: string | undefined } | { ok: false } {
  if (selectedIds.length < 2) return { ok: false };

  const selected = selectedIds
    .map((id) => cues.find((c) => c.id === id))
    .filter((c): c is Cue => !!c);

  if (selected.length !== selectedIds.length) return { ok: false };

  const parentKey = selected[0].parentId ?? null;
  if (!selected.every((c) => (c.parentId ?? null) === parentKey)) {
    return { ok: false };
  }

  for (const c of selected) {
    if (!isContainerCue(c)) continue;
    for (const other of selected) {
      if (other.id !== c.id && isCueDescendantOf(cues, c.id, other.id)) {
        return { ok: false };
      }
    }
  }

  return { ok: true, parentId: parentKey ?? undefined };
}

export function buildParallelGroupFromSelection(
  selectedIds: string[],
  cues: Cue[],
  groupName = "group",
): Cue[] | null {
  const check = canGroupSelectedCues(selectedIds, cues);
  if (!check.ok) return null;

  const selectedSet = new Set(selectedIds);
  const siblings = cues.filter((c) => (c.parentId ?? null) === (check.parentId ?? null));
  const orderedSelected = siblings.filter((c) => selectedSet.has(c.id));
  if (orderedSelected.length < 2) return null;

  const firstIdx = cues.findIndex((c) => c.id === orderedSelected[0].id);
  if (firstIdx === -1) return null;

  const group: Cue = {
    id: crypto.randomUUID(),
    number: "0",
    name: groupName,
    type: "group",
    parentId: check.parentId,
  };

  const withParents = cues.map((c) => (selectedSet.has(c.id) ? { ...c, parentId: group.id } : c));

  return [...withParents.slice(0, firstIdx), group, ...withParents.slice(firstIdx)];
}
