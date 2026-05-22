import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { findCueInLists } from "../../lib/cue-lists";
import type { Cue } from "../../types/cue";
import type { CueList } from "../../lib/cue-lists";
import { createCueEditorActions } from "./cue-editor-actions";
import { createCueListActions } from "./cue-list-actions";
import { createMidiMappingActions } from "./midi-mapping-actions";
import { createSelectionActions } from "./selection-actions";
import { createSnapshotActions } from "./snapshot-actions";
import { getActiveCueListFromState } from "./helpers";
import { initialProjectData } from "./initial-state";
import type { ProjectState } from "./types";

export { getActiveCueListFromState } from "./helpers";

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      ...initialProjectData,
      midiMappings: [...initialProjectData.midiMappings],
      ...createCueEditorActions(set, get),
      ...createSelectionActions(set, get),
      ...createCueListActions(set, get),
      ...createMidiMappingActions(set, get),
      ...createSnapshotActions(set, get),
    }),
    { name: "ProjectStore" },
  ),
);

export function useActiveCueList(): CueList {
  return useProjectStore((s) => getActiveCueListFromState(s));
}

export function useProjectCues(): Cue[] {
  return useProjectStore((s) => getActiveCueListFromState(s).cues);
}

export function findProjectCue(
  cueLists: CueList[],
  cueId: string,
): Cue | undefined {
  return findCueInLists(cueLists, cueId)?.cue;
}
