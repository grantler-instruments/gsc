import type { Cue } from "../types/cue";
import { cloneCueFields } from "./cue-clipboard";
import { type CueList, createCueList } from "./cue-lists";
import { renumberCueList } from "./cues";
import { randomId } from "./random-id";

interface CueListClipboardEntry {
  name: string;
  cues: Cue[];
}

let clipboard: CueListClipboardEntry | null = null;

/** Deep-clone a list's cues with fresh ids, remapping internal references. */
export function cloneCuesWithNewIds(cues: Cue[]): Cue[] {
  const idMap = new Map(cues.map((c) => [c.id, randomId()]));
  const mapId = (id: string | undefined) => (id ? (idMap.get(id) ?? id) : id);
  return cues.map((c) => {
    const newId = idMap.get(c.id);
    if (!newId) throw new Error(`Missing cloned id for cue ${c.id}`);
    return {
      ...cloneCueFields(c),
      id: newId,
      parentId: mapId(c.parentId),
      stopTargetId: mapId(c.stopTargetId),
      fadeTargetId: mapId(c.fadeTargetId),
    };
  });
}

/** Build a fresh CueList (new list id + new cue ids) from a name and source cues. */
export function createCueListFrom(name: string, cues: Cue[]): CueList {
  return {
    ...createCueList(name),
    cues: renumberCueList(cloneCuesWithNewIds(cues)),
  };
}

export function setCueListClipboard(list: CueList): void {
  clipboard = { name: list.name, cues: list.cues.map(cloneCueFields) };
}

export function getCueListClipboard(): CueListClipboardEntry | null {
  return clipboard;
}

export function hasCueListClipboard(): boolean {
  return clipboard !== null;
}
