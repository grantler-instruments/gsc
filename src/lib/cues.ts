import { fadeCueLabel, isFadeCue, isValidFadeTarget } from "./fade";
import type { Cue, FadeCueType } from "../types/cue";

export function isParallelGroup(cue: Cue): boolean {
  return cue.type === "group";
}

export function isSequenceGroup(cue: Cue): boolean {
  return cue.type === "sequence";
}

export function isStopCue(cue: Cue): boolean {
  return cue.type === "stop";
}

export { isFadeCue, isOpacityFadeCue, isVolumeFadeCue } from "./fade";

/** Stop or fade utility cues — not fired as playback leaves in parallel groups. */
export function isUtilityCue(cue: Cue): boolean {
  return isStopCue(cue) || isFadeCue(cue);
}

/** Parallel or sequential container. */
export function isContainerCue(cue: Cue): boolean {
  return isParallelGroup(cue) || isSequenceGroup(cue);
}

export function getStopTarget(
  stopCue: Cue,
  cues: Cue[],
): Cue | undefined {
  if (!isStopCue(stopCue) || !stopCue.stopTargetId) return undefined;
  return cues.find((c) => c.id === stopCue.stopTargetId);
}

export function getFadeTarget(
  fadeCue: Cue,
  cues: Cue[],
): Cue | undefined {
  if (!isFadeCue(fadeCue) || !fadeCue.fadeTargetId) return undefined;
  const target = cues.find((c) => c.id === fadeCue.fadeTargetId);
  if (!target || !isValidFadeTarget(fadeCue.type as FadeCueType, target)) {
    return undefined;
  }
  return target;
}

export function formatStopTargetLabel(target: Cue): string {
  return `${target.number} ${target.name}`;
}

/** Label shown in the list, footer, etc. Utility cues follow the target's name. */
export function getCueDisplayName(cue: Cue, cues: Cue[]): string {
  if (isStopCue(cue)) {
    const target = getStopTarget(cue, cues);
    if (!target) return "Stop (no target)";
    return `Stop ${target.name}`;
  }
  if (isFadeCue(cue)) {
    const target = getFadeTarget(cue, cues);
    const label = fadeCueLabel(cue.type as FadeCueType);
    if (!target) return `${label} (no target)`;
    return `${label} ${target.name}`;
  }
  return cue.name;
}

/** @deprecated Use isContainerCue */
export function isGroupCue(cue: Cue): boolean {
  return isContainerCue(cue);
}

export function getChildCues(cues: Cue[], parentId: string): Cue[] {
  return cues.filter((c) => c.parentId === parentId);
}

export function getTopLevelCues(cues: Cue[]): Cue[] {
  return cues.filter((c) => !c.parentId);
}

/** Insert a cue after the last sibling (same parentId), i.e. at the end of that list level. */
export function appendCueInList(cues: Cue[], cue: Cue): Cue[] {
  const parentKey = cue.parentId ?? null;
  let lastSiblingIndex = -1;
  cues.forEach((c, i) => {
    if ((c.parentId ?? null) === parentKey) lastSiblingIndex = i;
  });
  if (lastSiblingIndex === -1) return [...cues, cue];
  const next = [...cues];
  next.splice(lastSiblingIndex + 1, 0, cue);
  return next;
}

export function cuesShareParent(a: Cue, b: Cue): boolean {
  return (a.parentId ?? null) === (b.parentId ?? null);
}

/** Reorder among siblings (same parentId). Returns null if invalid. */
export function reorderSiblingCues(
  cues: Cue[],
  draggedId: string,
  targetId: string,
  place: "before" | "after",
): Cue[] | null {
  const dragged = cues.find((c) => c.id === draggedId);
  const target = cues.find((c) => c.id === targetId);
  if (!dragged || !target || dragged.id === target.id) return null;
  if (!cuesShareParent(dragged, target)) return null;

  const parentKey = dragged.parentId ?? null;
  const siblingIds = cues
    .filter((c) => (c.parentId ?? null) === parentKey)
    .map((c) => c.id);

  const fromIdx = siblingIds.indexOf(draggedId);
  let insertIdx = siblingIds.indexOf(targetId);
  if (fromIdx === -1 || insertIdx === -1) return null;
  if (place === "after") insertIdx += 1;

  siblingIds.splice(fromIdx, 1);
  if (fromIdx < insertIdx) insertIdx -= 1;
  siblingIds.splice(insertIdx, 0, draggedId);

  const siblingIndices: number[] = [];
  cues.forEach((c, i) => {
    if ((c.parentId ?? null) === parentKey) siblingIndices.push(i);
  });

  if (siblingIndices.length !== siblingIds.length) return null;

  const byId = new Map(cues.map((c) => [c.id, c]));
  const next = [...cues];
  siblingIndices.forEach((arrIdx, i) => {
    const id = siblingIds[i];
    const cue = byId.get(id);
    if (cue) next[arrIdx] = cue;
  });
  return next;
}

export interface CueListNode {
  cue: Cue;
  children: CueListNode[];
  depth: number;
}

export function buildCueTree(cues: Cue[]): CueListNode[] {
  const visit = (parentId: string | undefined, depth: number): CueListNode[] => {
    const siblings = cues.filter((c) =>
      parentId === undefined ? !c.parentId : c.parentId === parentId,
    );
    return siblings.map((cue) => ({
      cue,
      depth,
      children: isContainerCue(cue) ? visit(cue.id, depth + 1) : [],
    }));
  };
  return visit(undefined, 0);
}

/** Leaf ids fired together for a parallel group. */
export function resolveParallelGoIds(cue: Cue, cues: Cue[]): string[] {
  if (!isParallelGroup(cue)) return [cue.id];

  const ids: string[] = [];
  const walk = (groupId: string) => {
    for (const child of getChildCues(cues, groupId)) {
      if (isParallelGroup(child)) walk(child.id);
      else if (isSequenceGroup(child)) ids.push(child.id);
      else if (!isUtilityCue(child)) ids.push(child.id);
    }
  };
  walk(cue.id);
  return ids;
}

/**
 * Ordered steps for a sequence. Each step is cue ids to fire in parallel;
 * steps run one after another.
 */
export function expandSequenceSteps(
  sequenceId: string,
  cues: Cue[],
): string[][] {
  const steps: string[][] = [];

  for (const child of getChildCues(cues, sequenceId)) {
    if (isSequenceGroup(child)) {
      steps.push(...expandSequenceSteps(child.id, cues));
    } else if (isParallelGroup(child)) {
      const parallelIds = resolveParallelGoIds(child, cues);
      if (parallelIds.length > 0) steps.push(parallelIds);
    } else {
      steps.push([child.id]);
    }
  }

  return steps;
}

/** @deprecated Use resolveParallelGoIds */
export function resolveGoCueIds(cue: Cue, cues: Cue[]): string[] {
  if (isSequenceGroup(cue)) {
    return expandSequenceSteps(cue.id, cues).flat();
  }
  return resolveParallelGoIds(cue, cues);
}

export function resolveStopCueIds(cue: Cue, cues: Cue[]): string[] {
  if (!isContainerCue(cue)) return [cue.id];

  const ids = [cue.id];
  const walk = (containerId: string) => {
    for (const child of getChildCues(cues, containerId)) {
      ids.push(child.id);
      if (isContainerCue(child)) walk(child.id);
    }
  };
  walk(cue.id);
  return ids;
}

export function isCueActive(
  cue: Cue,
  cues: Cue[],
  activeCueIds: string[],
  runningSequence: { rootId: string; stepCueIds: string[] } | null,
): boolean {
  if (activeCueIds.includes(cue.id)) return true;

  if (runningSequence?.rootId === cue.id) return true;
  if (runningSequence?.stepCueIds.includes(cue.id)) return true;

  if (isParallelGroup(cue)) {
    const goIds = resolveParallelGoIds(cue, cues);
    return (
      goIds.length > 0 && goIds.every((id) => activeCueIds.includes(id))
    );
  }

  return false;
}

export function renumberCueList(cues: Cue[]): Cue[] {
  const result = new Map<string, Cue>();

  const applyLevel = (siblings: Cue[], parentNumber?: string) => {
    siblings.forEach((cue, index) => {
      const number = parentNumber
        ? `${parentNumber}.${index + 1}`
        : String(index + 1);
      result.set(cue.id, { ...cue, number });
      if (isContainerCue(cue)) {
        applyLevel(getChildCues(cues, cue.id), number);
      }
    });
  };

  applyLevel(getTopLevelCues(cues));
  return cues.map((c) => result.get(c.id) ?? c);
}
