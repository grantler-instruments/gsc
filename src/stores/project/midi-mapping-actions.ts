import type { StoreApi } from "zustand";
import { randomId } from "../../lib/random-id";
import { buildNoteToCueMappings } from "../../lib/midi-mapping";
import { getActiveCueListFromState } from "./helpers";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

export function createMidiMappingActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<
  ProjectState,
  | "addMidiMapping"
  | "removeMidiMapping"
  | "updateMidiMapping"
  | "setMidiMappings"
  | "autoMapNotesToCues"
> {
  return {
    addMidiMapping: (mapping) => {
      const entry = { ...mapping, id: randomId() };
      set((s) => ({ midiMappings: [...s.midiMappings, entry] }));
      return entry;
    },

    removeMidiMapping: (id) =>
      set((s) => ({
        midiMappings: s.midiMappings.filter((m) => m.id !== id),
      })),

    updateMidiMapping: (id, patch) =>
      set((s) => ({
        midiMappings: s.midiMappings.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      })),

    setMidiMappings: (midiMappings) => set({ midiMappings }),

    autoMapNotesToCues: (startNote = 36) => {
      const active = getActiveCueListFromState(get());
      set({
        midiMappings: buildNoteToCueMappings(active.cues, startNote),
      });
    },
  };
}
