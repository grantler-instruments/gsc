import type { StoreApi } from "zustand";
import {
  createVideoBus,
  normalizeMasterVideoOutputName,
  normalizeVideoBuses,
} from "../../lib/video-buses";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

export function createVideoBusActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<
  ProjectState,
  "addVideoBus" | "removeVideoBus" | "updateVideoBus" | "updateMasterVideoOutputName"
> {
  return {
    addVideoBus: (overrides = {}) => {
      const bus = createVideoBus(get().videoBuses, overrides);
      set((state) => ({ videoBuses: [...state.videoBuses, bus] }));
      return bus;
    },

    removeVideoBus: (id) =>
      set((state) => ({
        videoBuses: normalizeVideoBuses(state.videoBuses.filter((bus) => bus.id !== id)),
        cueLists: state.cueLists.map((list) => ({
          ...list,
          cues: list.cues.map((cue) =>
            cue.videoBusId === id ? { ...cue, videoBusId: undefined } : cue,
          ),
        })),
      })),

    updateVideoBus: (id, patch) =>
      set((state) => ({
        videoBuses: normalizeVideoBuses(
          state.videoBuses.map((bus) => (bus.id === id ? { ...bus, ...patch, id: bus.id } : bus)),
        ),
      })),

    updateMasterVideoOutputName: (name) =>
      set({ masterVideoOutputName: normalizeMasterVideoOutputName(name) }),
  };
}
