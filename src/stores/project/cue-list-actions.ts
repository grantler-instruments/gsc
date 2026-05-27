import type { StoreApi } from "zustand";
import { createCueList, nextCueListName } from "../../lib/cue-lists";
import { canEditProject } from "../../lib/show-mode";
import { getActiveCueListFromState } from "./helpers";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

export function createCueListActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<
  ProjectState,
  "addCueList" | "removeCueList" | "renameCueList" | "setActiveCueList" | "setShowMetadata"
> {
  return {
    addCueList: (name) => {
      if (!canEditProject()) return getActiveCueListFromState(get());
      const list = createCueList(name ?? nextCueListName(get().cueLists));
      set((s) => ({
        cueLists: [...s.cueLists, list],
        activeCueListId: list.id,
      }));
      return list;
    },

    removeCueList: (listId) => {
      if (!canEditProject()) return;
      const { cueLists } = get();
      if (cueLists.length <= 1) return;
      const nextLists = cueLists.filter((l) => l.id !== listId);
      set((s) => ({
        cueLists: nextLists,
        activeCueListId: s.activeCueListId === listId ? nextLists[0].id : s.activeCueListId,
      }));
    },

    renameCueList: (listId, name) => {
      if (!canEditProject()) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      set((s) => ({
        cueLists: s.cueLists.map((l) => (l.id === listId ? { ...l, name: trimmed } : l)),
      }));
    },

    setActiveCueList: (listId) => {
      if (get().cueLists.some((l) => l.id === listId)) {
        set({ activeCueListId: listId });
      }
    },

    setShowMetadata: ({ name, startDate, endDate, description }) => {
      if (!canEditProject()) return;
      const trimmedName = name.trim();
      if (!trimmedName) return;
      set({
        name: trimmedName,
        startDate: startDate?.trim() || undefined,
        endDate: endDate?.trim() || undefined,
        description: description?.trim() || undefined,
      });
    },
  };
}
