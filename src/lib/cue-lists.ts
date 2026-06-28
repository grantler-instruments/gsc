import { t } from "../i18n/t";
import type { Cue } from "../types/cue";
import { randomId } from "./random-id";

export interface CueList {
  id: string;
  name: string;
  cues: Cue[];
  selectedCueIds: string[];
  selectionAnchorId: string | null;
}

export function createCueList(name: string): CueList {
  return {
    id: randomId(),
    name,
    cues: [],
    selectedCueIds: [],
    selectionAnchorId: null,
  };
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

/**
 * Reorder `lists` by moving `draggedId` before/after `targetId`.
 * Returns a new array, or null when the move is a no-op or ids are missing.
 */
export function reorderCueLists(
  lists: CueList[],
  draggedId: string,
  targetId: string,
  place: "before" | "after",
): CueList[] | null {
  if (draggedId === targetId) return null;
  const fromIndex = lists.findIndex((l) => l.id === draggedId);
  if (fromIndex === -1 || !lists.some((l) => l.id === targetId)) return null;

  const next = [...lists];
  const [moved] = next.splice(fromIndex, 1);
  const targetIndex = next.findIndex((l) => l.id === targetId);
  const insertAt = place === "after" ? targetIndex + 1 : targetIndex;
  next.splice(insertAt, 0, moved);

  const unchanged = next.every((l, i) => l.id === lists[i].id);
  return unchanged ? null : next;
}

export function nextCueListName(cueLists: CueList[]): string {
  const used = new Set(cueLists.map((l) => l.name));
  let n = cueLists.length + 1;
  let name = t("project.generatedListName", { number: n });
  while (used.has(name)) {
    n += 1;
    name = t("project.generatedListName", { number: n });
  }
  return name;
}

/** A unique display name for a pasted/duplicated list, appending a "copy" suffix when needed. */
export function uniqueCueListName(name: string, cueLists: CueList[]): string {
  const used = new Set(cueLists.map((l) => l.name));
  if (!used.has(name)) return name;
  const suffix = t("cueList.copySuffix");
  let candidate = `${name} ${suffix}`;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${name} ${suffix} ${n}`;
    n += 1;
  }
  return candidate;
}
