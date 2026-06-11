import type { StoreApi } from "zustand";
import { reopenCompactInspectorDrawerIfEditing } from "../../lib/compact-inspector-drawer";
import {
  collectCuesForCopy,
  getCueClipboard,
  prepareCuePaste,
  setCueClipboard,
} from "../../lib/cue-clipboard";
import {
  buildParallelGroupFromSelection,
  flattenVisibleCueIds,
  getPrimarySelectedCueId,
} from "../../lib/cue-selection";
import { getChildCues, isContainerCue, isFadeCue, isStopCue } from "../../lib/cues";
import { syncHostSelectionToRemotes } from "../../lib/host-selection-bridge";
import { sendRemoteCommand } from "../../lib/remote-client";
import { canEditProject } from "../../lib/show-mode";
import { isRemoteClient } from "../../platform/remote-mode";
import { guardDmxPreviewSelection } from "../../stores/dmx-preview-session";
import { useUiStore } from "../../stores/ui";
import type { Cue } from "../../types/cue";
import {
  applyRenumber,
  getActiveCueListFromState,
  patchActiveList,
  patchListById,
} from "./helpers";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

function collectSelectedRootIds(selectedIds: string[], cues: Cue[]): string[] {
  const selectedSet = new Set(selectedIds);
  return selectedIds.filter((id) => {
    const cue = cues.find((c) => c.id === id);
    if (!cue) return false;
    return !cue.parentId || !selectedSet.has(cue.parentId);
  });
}

function collectCueRemovalIds(cues: Cue[], rootId: string): Set<string> {
  const toRemove = new Set<string>([rootId]);
  const collect = (cueId: string) => {
    for (const child of getChildCues(cues, cueId)) {
      toRemove.add(child.id);
      if (isContainerCue(child)) collect(child.id);
    }
  };
  const target = cues.find((c) => c.id === rootId);
  if (target && isContainerCue(target)) collect(rootId);
  return toRemove;
}

export function createSelectionActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<
  ProjectState,
  | "selectCue"
  | "selectCueInList"
  | "toggleSelectCue"
  | "selectCueRange"
  | "groupSelectedCues"
  | "copySelectedCues"
  | "cutSelectedCues"
  | "pasteSelectedCues"
  | "duplicateSelectedCues"
> {
  return {
    selectCue: (id) => {
      if (isRemoteClient()) {
        set((s) => ({
          ...patchActiveList(s, () => ({
            selectedCueIds: id ? [id] : [],
            selectionAnchorId: id,
          })),
        }));
        if (id) sendRemoteCommand({ action: "select-cue", cueId: id });
        return;
      }
      if (!guardDmxPreviewSelection(id)) return;
      set((s) => ({
        ...patchActiveList(s, () => ({
          selectedCueIds: id ? [id] : [],
          selectionAnchorId: id,
        })),
      }));
      if (id) {
        reopenCompactInspectorDrawerIfEditing();
      }
      syncHostSelectionToRemotes();
    },

    selectCueInList: (listId, id) => {
      if (isRemoteClient()) {
        set((s) => ({
          ...patchListById(s, listId, () => ({
            selectedCueIds: id ? [id] : [],
            selectionAnchorId: id,
          })),
        }));
        if (id) sendRemoteCommand({ action: "select-cue", cueId: id });
        return;
      }
      if (!guardDmxPreviewSelection(id)) return;
      set((s) => ({
        ...patchListById(s, listId, () => ({
          selectedCueIds: id ? [id] : [],
          selectionAnchorId: id,
        })),
      }));
      syncHostSelectionToRemotes();
    },

    toggleSelectCue: (id) => {
      const active = getActiveCueListFromState(get());
      const has = active.selectedCueIds.includes(id);
      const nextPrimary = has
        ? (active.selectedCueIds.filter((x) => x !== id).slice(-1)[0] ?? null)
        : id;
      if (!guardDmxPreviewSelection(nextPrimary)) return;
      set((s) => ({
        ...patchActiveList(s, (list) => {
          const has = list.selectedCueIds.includes(id);
          const selectedCueIds = has
            ? list.selectedCueIds.filter((x) => x !== id)
            : [...list.selectedCueIds, id];
          return { selectedCueIds, selectionAnchorId: id };
        }),
      }));
      if (getPrimarySelectedCueId(getActiveCueListFromState(get()).selectedCueIds)) {
        reopenCompactInspectorDrawerIfEditing();
      }
      syncHostSelectionToRemotes();
    },

    selectCueRange: (id, visibleOrder) => {
      if (!guardDmxPreviewSelection(id)) return;
      const active = getActiveCueListFromState(get());
      const anchor = active.selectionAnchorId ?? active.selectedCueIds[0] ?? id;
      const a = visibleOrder.indexOf(anchor);
      const b = visibleOrder.indexOf(id);
      if (a === -1 || b === -1) {
        set({
          ...patchActiveList(get(), () => ({
            selectedCueIds: [id],
            selectionAnchorId: id,
          })),
        });
        syncHostSelectionToRemotes();
        reopenCompactInspectorDrawerIfEditing();
        return;
      }
      const [lo, hi] = a < b ? [a, b] : [b, a];
      set({
        ...patchActiveList(get(), () => ({
          selectedCueIds: visibleOrder.slice(lo, hi + 1),
          selectionAnchorId: anchor,
        })),
      });
      reopenCompactInspectorDrawerIfEditing();
      syncHostSelectionToRemotes();
    },

    groupSelectedCues: () => {
      if (!canEditProject()) return null;
      const active = getActiveCueListFromState(get());
      const next = buildParallelGroupFromSelection(active.selectedCueIds, active.cues);
      if (!next) return null;

      const group = next.find(
        (c) => c.type === "group" && !active.cues.some((existing) => existing.id === c.id),
      );
      if (!group) return null;

      const renumbered = applyRenumber(next);
      set({
        ...patchActiveList(get(), () => ({
          cues: renumbered,
          selectedCueIds: [group.id],
          selectionAnchorId: group.id,
        })),
      });
      return group;
    },

    copySelectedCues: () => {
      if (!canEditProject()) return false;
      const active = getActiveCueListFromState(get());
      const collected = collectCuesForCopy(active.selectedCueIds, active.cues);
      if (collected.length === 0) return false;
      setCueClipboard(collected);
      return true;
    },

    cutSelectedCues: () => {
      if (!canEditProject()) return false;
      const active = getActiveCueListFromState(get());
      const collected = collectCuesForCopy(active.selectedCueIds, active.cues);
      if (collected.length === 0) return false;

      setCueClipboard(collected);

      const roots = collectSelectedRootIds(active.selectedCueIds, active.cues);
      const toRemove = new Set<string>();
      for (const rootId of roots) {
        for (const id of collectCueRemovalIds(active.cues, rootId)) {
          toRemove.add(id);
        }
      }
      for (const c of active.cues) {
        if (isStopCue(c) && c.stopTargetId && toRemove.has(c.stopTargetId)) toRemove.add(c.id);
        if (isFadeCue(c) && c.fadeTargetId && toRemove.has(c.fadeTargetId)) toRemove.add(c.id);
      }

      const collapsed = new Set(useUiStore.getState().collapsedCueGroupIds);
      const order = flattenVisibleCueIds(active.cues, collapsed);
      const primary = getPrimarySelectedCueId(active.selectedCueIds);
      let nextId: string | null = null;
      if (primary) {
        const index = order.indexOf(primary);
        if (index !== -1) {
          for (let i = index + 1; i < order.length; i++) {
            if (!toRemove.has(order[i])) {
              nextId = order[i];
              break;
            }
          }
          if (!nextId) {
            for (let i = index - 1; i >= 0; i--) {
              if (!toRemove.has(order[i])) {
                nextId = order[i];
                break;
              }
            }
          }
        }
      }

      set({
        ...patchActiveList(get(), () => ({
          cues: applyRenumber(active.cues.filter((c) => !toRemove.has(c.id))),
          selectedCueIds: nextId ? [nextId] : [],
          selectionAnchorId: nextId,
        })),
      });
      return true;
    },

    pasteSelectedCues: () => {
      if (!canEditProject()) return false;
      const clipboard = getCueClipboard();
      if (!clipboard?.length) return false;

      const active = getActiveCueListFromState(get());
      const anchorId = getPrimarySelectedCueId(active.selectedCueIds);
      const prepared = prepareCuePaste(clipboard, active.cues, anchorId);
      if (!prepared) return false;

      set({
        ...patchActiveList(get(), () => ({
          cues: prepared.cues,
          selectedCueIds: prepared.selectedCueIds,
          selectionAnchorId: prepared.selectedCueIds[prepared.selectedCueIds.length - 1] ?? null,
        })),
      });
      return true;
    },

    duplicateSelectedCues: () => {
      if (!canEditProject()) return false;
      const active = getActiveCueListFromState(get());
      if (active.selectedCueIds.length === 0) return false;

      const collected = collectCuesForCopy(active.selectedCueIds, active.cues);
      if (collected.length === 0) return false;

      const anchorId = getPrimarySelectedCueId(active.selectedCueIds);
      const prepared = prepareCuePaste(collected, active.cues, anchorId);
      if (!prepared) return false;

      set({
        ...patchActiveList(get(), () => ({
          cues: prepared.cues,
          selectedCueIds: prepared.selectedCueIds,
          selectionAnchorId: prepared.selectedCueIds[prepared.selectedCueIds.length - 1] ?? null,
        })),
      });
      return true;
    },
  };
}
