import type { StoreApi } from "zustand";
import { createCueList, nextCueListName } from "../../lib/cue-lists";
import { syncHostSelectionToRemotes } from "../../lib/host-selection-bridge";
import { sendRemoteCommand } from "../../lib/remote-client";
import { canEditProject } from "../../lib/show-mode";
import { isRemoteClient } from "../../platform/remote-mode";
import {
  getActiveCueListFromState,
  resolveActiveHotListId,
  resolveMainSequenceListId,
} from "./helpers";
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
    addCueList: (name, kind = "sequence") => {
      if (!canEditProject()) return getActiveCueListFromState(get());
      const list = createCueList(name ?? nextCueListName(get().cueLists, kind), kind);
      set((s) => ({
        cueLists: [...s.cueLists, list],
        activeCueListId: list.id,
        ...(kind === "hot" ? { activeHotCueListId: list.id } : { mainSequenceListId: list.id }),
      }));
      return list;
    },

    removeCueList: (listId) => {
      if (!canEditProject()) return;
      const { cueLists } = get();
      if (cueLists.length <= 1) return;
      const nextLists = cueLists.filter((l) => l.id !== listId);
      set((s) => {
        const activeCueListId = s.activeCueListId === listId ? nextLists[0].id : s.activeCueListId;
        const next = { ...s, cueLists: nextLists };
        return {
          cueLists: nextLists,
          activeCueListId,
          mainSequenceListId: resolveMainSequenceListId(next) ?? nextLists[0].id,
          activeHotCueListId: resolveActiveHotListId(next),
        };
      });
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
      if (isRemoteClient()) {
        sendRemoteCommand({ action: "set-active-cue-list", cueListId: listId });
        return;
      }
      const list = get().cueLists.find((l) => l.id === listId);
      if (list) {
        set(
          list.kind === "hot"
            ? { activeCueListId: listId, activeHotCueListId: listId }
            : { activeCueListId: listId, mainSequenceListId: listId },
        );
        syncHostSelectionToRemotes();
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
