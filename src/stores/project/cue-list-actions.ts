import type { StoreApi } from "zustand";
import {
  createCueListFrom,
  getCueListClipboard,
  setCueListClipboard,
} from "../../lib/cue-list-clipboard";
import {
  createCueList,
  nextCueListName,
  reorderCueLists,
  uniqueCueListName,
} from "../../lib/cue-lists";
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
  | "addCueList"
  | "removeCueList"
  | "renameCueList"
  | "reorderCueListRelative"
  | "copyCueList"
  | "cutCueList"
  | "pasteCueList"
  | "duplicateCueList"
  | "setActiveCueList"
  | "setShowMetadata"
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

    reorderCueListRelative: (draggedId, targetId, place) => {
      if (!canEditProject()) return;
      const next = reorderCueLists(get().cueLists, draggedId, targetId, place);
      if (!next) return;
      set({ cueLists: next });
    },

    copyCueList: (listId) => {
      if (!canEditProject()) return;
      const list = get().cueLists.find((l) => l.id === listId);
      if (!list) return;
      setCueListClipboard(list);
    },

    cutCueList: (listId) => {
      if (!canEditProject()) return;
      const { cueLists } = get();
      if (cueLists.length <= 1) return;
      const list = cueLists.find((l) => l.id === listId);
      if (!list) return;
      setCueListClipboard(list);
      const nextLists = cueLists.filter((l) => l.id !== listId);
      set((s) => ({
        cueLists: nextLists,
        activeCueListId: s.activeCueListId === listId ? nextLists[0].id : s.activeCueListId,
      }));
    },

    pasteCueList: (afterListId) => {
      if (!canEditProject()) return;
      const entry = getCueListClipboard();
      if (!entry) return;
      const { cueLists, activeCueListId } = get();
      const newList = createCueListFrom(uniqueCueListName(entry.name, cueLists), entry.cues);
      const anchorId = afterListId ?? activeCueListId;
      const anchorIndex = cueLists.findIndex((l) => l.id === anchorId);
      const insertAt = anchorIndex === -1 ? cueLists.length : anchorIndex + 1;
      set({
        cueLists: [...cueLists.slice(0, insertAt), newList, ...cueLists.slice(insertAt)],
        activeCueListId: newList.id,
      });
    },

    duplicateCueList: (listId) => {
      if (!canEditProject()) return;
      const { cueLists } = get();
      const index = cueLists.findIndex((l) => l.id === listId);
      if (index === -1) return;
      const source = cueLists[index];
      const newList = createCueListFrom(uniqueCueListName(source.name, cueLists), source.cues);
      set({
        cueLists: [...cueLists.slice(0, index + 1), newList, ...cueLists.slice(index + 1)],
        activeCueListId: newList.id,
      });
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
