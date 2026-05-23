import {
  buildParallelGroupFromSelection,
  getPrimarySelectedCueId,
} from "../../lib/cue-selection";
import {
  collectCuesForCopy,
  getCueClipboard,
  prepareCuePaste,
  setCueClipboard,
} from "../../lib/cue-clipboard";
import { guardDmxPreviewSelection } from "../../stores/dmx-preview-session";
import { canEditProject } from "../../lib/show-mode";
import type { StoreApi } from "zustand";
import type { ProjectState } from "./types";
import {
  applyRenumber,
  getActiveCueListFromState,
  patchActiveList,
} from "./helpers";

type ProjectStore = StoreApi<ProjectState>;

export function createSelectionActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<
  ProjectState,
  | "selectCue"
  | "toggleSelectCue"
  | "selectCueRange"
  | "groupSelectedCues"
  | "copySelectedCues"
  | "pasteSelectedCues"
  | "duplicateSelectedCues"
> {
  return {
    selectCue: (id) => {
      if (!guardDmxPreviewSelection(id)) return;
      set((s) => ({
        ...patchActiveList(s, () => ({
          selectedCueIds: id ? [id] : [],
          selectionAnchorId: id,
        })),
      }));
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
    },

    selectCueRange: (id, visibleOrder) => {
      if (!guardDmxPreviewSelection(id)) return;
      const active = getActiveCueListFromState(get());
      const anchor =
        active.selectionAnchorId ?? active.selectedCueIds[0] ?? id;
      const a = visibleOrder.indexOf(anchor);
      const b = visibleOrder.indexOf(id);
      if (a === -1 || b === -1) {
        set({
          ...patchActiveList(get(), () => ({
            selectedCueIds: [id],
            selectionAnchorId: id,
          })),
        });
        return;
      }
      const [lo, hi] = a < b ? [a, b] : [b, a];
      set({
        ...patchActiveList(get(), () => ({
          selectedCueIds: visibleOrder.slice(lo, hi + 1),
          selectionAnchorId: anchor,
        })),
      });
    },

    groupSelectedCues: () => {
      if (!canEditProject()) return null;
      const active = getActiveCueListFromState(get());
      const next = buildParallelGroupFromSelection(
        active.selectedCueIds,
        active.cues,
      );
      if (!next) return null;

      const group = next.find(
        (c) =>
          c.type === "group" &&
          !active.cues.some((existing) => existing.id === c.id),
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
      const collected = collectCuesForCopy(
        active.selectedCueIds,
        active.cues,
      );
      if (collected.length === 0) return false;
      setCueClipboard(collected);
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
          selectionAnchorId:
            prepared.selectedCueIds[prepared.selectedCueIds.length - 1] ??
            null,
        })),
      });
      return true;
    },

    duplicateSelectedCues: () => {
      if (!canEditProject()) return false;
      const active = getActiveCueListFromState(get());
      if (active.selectedCueIds.length === 0) return false;

      const collected = collectCuesForCopy(
        active.selectedCueIds,
        active.cues,
      );
      if (collected.length === 0) return false;

      const anchorId = getPrimarySelectedCueId(active.selectedCueIds);
      const prepared = prepareCuePaste(collected, active.cues, anchorId);
      if (!prepared) return false;

      set({
        ...patchActiveList(get(), () => ({
          cues: prepared.cues,
          selectedCueIds: prepared.selectedCueIds,
          selectionAnchorId:
            prepared.selectedCueIds[prepared.selectedCueIds.length - 1] ??
            null,
        })),
      });
      return true;
    },
  };
}
