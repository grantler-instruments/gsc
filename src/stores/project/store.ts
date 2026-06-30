import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { CueList } from "../../lib/cue-lists";
import { findCueInLists } from "../../lib/cue-lists";
import type { Cue } from "../../types/cue";
import { registerDmxPreviewProjectAccess } from "../dmx-preview-session";
import { createAudioBusActions } from "./audio-bus-actions";
import { createCueEditorActions } from "./cue-editor-actions";
import { createCueListActions } from "./cue-list-actions";
import { createFixtureActions } from "./fixture-actions";
import { createFixturePlotActions } from "./fixture-plot-actions";
import { getActiveCueListFromState } from "./helpers";
import { initialProjectData } from "./initial-state";
import { createMidiMappingActions } from "./midi-mapping-actions";
import { createSelectionActions } from "./selection-actions";
import { createSnapshotActions } from "./snapshot-actions";
import type { ProjectState } from "./types";
import { createVideoBusActions } from "./video-bus-actions";

export { getActiveCueListFromState } from "./helpers";

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      ...initialProjectData,
      midiMappings: [...initialProjectData.midiMappings],
      fixtures: [...initialProjectData.fixtures],
      audioBuses: [...initialProjectData.audioBuses],
      videoBuses: [...initialProjectData.videoBuses],
      fixturePlot: { ...initialProjectData.fixturePlot, entries: [] },
      ...createCueEditorActions(set, get),
      ...createSelectionActions(set, get),
      ...createCueListActions(set, get),
      ...createMidiMappingActions(set, get),
      ...createFixtureActions(set, get),
      ...createAudioBusActions(set, get),
      ...createVideoBusActions(set, get),
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

export function useProjectCues(): Cue[] {
  return useProjectStore((s) => getActiveCueListFromState(s).cues);
}

export function findProjectCue(cueLists: CueList[], cueId: string): Cue | undefined {
  return findCueInLists(cueLists, cueId)?.cue;
}
