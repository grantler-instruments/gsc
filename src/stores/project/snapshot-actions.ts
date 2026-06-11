import type { StoreApi } from "zustand";
import { setActiveProjectId } from "../../lib/active-project-id";
import { cueListsToSnapshot, snapshotToCueLists } from "../../lib/project-snapshot";
import { canEditProject } from "../../lib/show-mode";
import { resolveActiveHotListId, resolveMainSequenceListId } from "./helpers";
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
      set({
        ...loaded,
        mainSequenceListId:
          resolveMainSequenceListId({
            cueLists: loaded.cueLists,
            mainSequenceListId: loaded.activeCueListId,
          }) ?? loaded.activeCueListId,
        activeHotCueListId: resolveActiveHotListId({
          cueLists: loaded.cueLists,
          activeHotCueListId: null,
        }),
      });
    },

    getSnapshot: () => {
      const {
        id,
        name,
        startDate,
        endDate,
        description,
        cueLists,
        activeCueListId,
        midiMappings,
        fixtures,
        fixturePlot,
      } = get();
      return cueListsToSnapshot(
        id,
        name,
        cueLists,
        activeCueListId,
        midiMappings,
        fixtures,
        fixturePlot,
        startDate,
        endDate,
        description,
      );
    },
  };
}
