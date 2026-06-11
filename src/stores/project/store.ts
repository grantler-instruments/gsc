import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { CueList } from "../../lib/cue-lists";
import { findCueInLists } from "../../lib/cue-lists";
import type { Cue } from "../../types/cue";
import { registerDmxPreviewProjectAccess } from "../dmx-preview-session";
import { createCueEditorActions } from "./cue-editor-actions";
import { createCueListActions } from "./cue-list-actions";
import { createFixtureActions } from "./fixture-actions";
import { createFixturePlotActions } from "./fixture-plot-actions";
import {
  getActiveCueListFromState,
  resolveActiveHotListId,
  resolveMainSequenceListId,
} from "./helpers";
import { initialProjectData } from "./initial-state";
import { createMidiMappingActions } from "./midi-mapping-actions";
import { createSelectionActions } from "./selection-actions";
import { createSnapshotActions } from "./snapshot-actions";
import type { ProjectState } from "./types";

export { getActiveCueListFromState } from "./helpers";

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      ...initialProjectData,
      midiMappings: [...initialProjectData.midiMappings],
      fixtures: [...initialProjectData.fixtures],
      fixturePlot: { ...initialProjectData.fixturePlot, entries: [] },
      ...createCueEditorActions(set, get),
      ...createSelectionActions(set, get),
      ...createCueListActions(set, get),
      ...createMidiMappingActions(set, get),
      ...createFixtureActions(set, get),
      ...createFixturePlotActions(set, get),
      ...createSnapshotActions(set, get),
    }),
    { name: "ProjectStore" },
  ),
);

registerDmxPreviewProjectAccess(() => useProjectStore.getState());

export function useActiveCueList(): CueList {
  return useProjectStore((s) => getActiveCueListFromState(s));
}

/** The sequence list shown in the main cue panel (independent of edit focus). */
export function useMainSequenceList(): CueList | null {
  return useProjectStore((s) => {
    const id = resolveMainSequenceListId(s);
    return id ? (s.cueLists.find((l) => l.id === id) ?? null) : null;
  });
}

/** The hot list shown in the hot-cue panel, or null when no hot lists exist. */
export function useActiveHotCueList(): CueList | null {
  return useProjectStore((s) => {
    const id = resolveActiveHotListId(s);
    return id ? (s.cueLists.find((l) => l.id === id) ?? null) : null;
  });
}

export function useProjectCues(): Cue[] {
  return useProjectStore((s) => getActiveCueListFromState(s).cues);
}

export function findProjectCue(cueLists: CueList[], cueId: string): Cue | undefined {
  return findCueInLists(cueLists, cueId)?.cue;
}
