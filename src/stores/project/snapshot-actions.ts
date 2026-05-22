import { setActiveProjectId } from "../../lib/active-project-id";
import {
  cueListsToSnapshot,
  snapshotToCueLists,
} from "../../lib/project-snapshot";
import { canEditProject } from "../../lib/show-mode";
import type { StoreApi } from "zustand";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

export function createSnapshotActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<ProjectState, "loadSnapshot" | "getSnapshot"> {
  return {
    loadSnapshot: (snap) => {
      if (!canEditProject()) return;
      const loaded = snapshotToCueLists(snap);
      setActiveProjectId(loaded.id);
      set(loaded);
    },

    getSnapshot: () => {
      const { id, name, cueLists, activeCueListId, midiMappings } = get();
      return cueListsToSnapshot(
        id,
        name,
        cueLists,
        activeCueListId,
        midiMappings,
      );
    },
  };
}
