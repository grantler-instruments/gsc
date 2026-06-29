import type { Cue } from "../types/cue";
import { isCueDescendantOf } from "./cue-selection";
import { cuesShareParent, isContainerCue, reorderSiblingCues } from "./cues";

/** Move a cue next to a target, changing parent when needed. */
export function reparentCueRelative(
  cues: Cue[],
  draggedId: string,
  targetId: string,
  place: "before" | "after",
): Cue[] | null {
  const dragged = cues.find((c) => c.id === draggedId);
  const target = cues.find((c) => c.id === targetId);
  if (!dragged || !target || dragged.id === target.id) return null;

  if (cuesShareParent(dragged, target)) {
    return reorderSiblingCues(cues, draggedId, targetId, place);
  }

  const newParentId = target.parentId;
  if (isContainerCue(dragged)) {
    if (isCueDescendantOf(cues, dragged.id, target.id)) return null;
    if (newParentId && isCueDescendantOf(cues, dragged.id, newParentId)) return null;
  }

  const withParent = cues.map((c) => (c.id === draggedId ? { ...c, parentId: newParentId } : c));
  return reorderSiblingCues(withParent, draggedId, targetId, place);
}

/** Move a cue to the end of the top-level list, unparenting it when nested. */
export function reparentCueToListEnd(cues: Cue[], draggedId: string): Cue[] | null {
  const topLevel = cues.filter((c) => !c.parentId);
  const last = topLevel[topLevel.length - 1];
  if (!last || last.id === draggedId) return null;
  return reparentCueRelative(cues, draggedId, last.id, "after");
}
