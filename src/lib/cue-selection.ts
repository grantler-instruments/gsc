import type { Cue } from "../types/cue";
import { buildCueTree, type CueListNode, getChildCues, isContainerCue } from "./cues";
import { randomId } from "./random-id";

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
    id: randomId(),
    number: "0",
    name: groupName,
    type: "group",
    parentId: check.parentId,
  };

  const withParents = cues.map((c) => (selectedSet.has(c.id) ? { ...c, parentId: group.id } : c));

  return [...withParents.slice(0, firstIdx), group, ...withParents.slice(firstIdx)];
}

/** Dissolve a container: remove it and promote its direct children to its parent level. */
export function ungroupContainerCue(cues: Cue[], containerId: string): Cue[] | null {
  const container = cues.find((c) => c.id === containerId);
  if (!container || !isContainerCue(container)) return null;

  const children = getChildCues(cues, containerId);
  const childIds = children.map((c) => c.id);
  const newParentId = container.parentId;
  const parentKey = container.parentId ?? null;

  const siblingIds = cues.filter((c) => (c.parentId ?? null) === parentKey).map((c) => c.id);
  const containerIdx = siblingIds.indexOf(containerId);
  if (containerIdx === -1) return null;

  const nextSiblingIds = [
    ...siblingIds.slice(0, containerIdx),
    ...childIds,
    ...siblingIds.slice(containerIdx + 1),
  ];

  const updated = cues
    .filter((c) => c.id !== containerId)
    .map((c) => (c.parentId === containerId ? { ...c, parentId: newParentId } : c));

  const siblingIndices: number[] = [];
  updated.forEach((c, i) => {
    if ((c.parentId ?? null) === parentKey) siblingIndices.push(i);
  });
  if (siblingIndices.length !== nextSiblingIds.length) return null;

  const byId = new Map(updated.map((c) => [c.id, c]));
  const next = [...updated];
  siblingIndices.forEach((arrIdx, i) => {
    const cue = byId.get(nextSiblingIds[i]);
    if (cue) next[arrIdx] = cue;
  });
  return next;
}
