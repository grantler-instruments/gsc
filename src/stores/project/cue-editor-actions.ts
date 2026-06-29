import type { StoreApi } from "zustand";
import { cueUsesAsset } from "../../lib/cue-asset";
import { moveCueBetweenLists } from "../../lib/cue-list-move";
import { findCueInLists } from "../../lib/cue-lists";
import {
  reparentCueRelative as reparentCueRelativeList,
  reparentCueToListEnd as reparentCueToListEndList,
} from "../../lib/cue-reparent";
import { getPrimarySelectedCueId } from "../../lib/cue-selection";
import {
  appendCueInList,
  canStopTarget,
  getChildCues,
  isContainerCue,
  reorderSiblingCues,
} from "../../lib/cues";
import { defaultDmxCueData, normalizeDmxCueData } from "../../lib/dmx";
import { defaultFadeCueFields, fadeCueLabel, isValidFadeTarget } from "../../lib/fade";
import { defaultMidiCueData } from "../../lib/midi";
import { defaultOscCueData } from "../../lib/osc";
import { runWithoutHistory } from "../../lib/project-history";
import { randomId } from "../../lib/random-id";
import { canEditProject } from "../../lib/show-mode";
import type { Cue } from "../../types/cue";
import {
  applyRenumber,
  expandCueRemovalSet,
  firstCueOrStub,
  getActiveCueListFromState,
  isMediaCueType,
  patchActiveList,
  patchListById,
} from "./helpers";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

type NewCueOpts = {
  name: string;
  type: Cue["type"];
  assetPath?: string;
  midi?: Cue["midi"];
  osc?: Cue["osc"];
  dmx?: Cue["dmx"];
  parentId?: string;
};

function resolveParentId(cues: Cue[], parentId: string | undefined): string | undefined {
  if (!parentId) return undefined;
  const parent = cues.find((c) => c.id === parentId);
  if (!parent || !isContainerCue(parent)) return undefined;
  return parentId;
}

function createCueFromOpts(opts: NewCueOpts, fixtures: ProjectState["fixtures"]): Cue {
  const { name, type, assetPath, midi, osc, dmx, parentId } = opts;
  return {
    id: randomId(),
    number: "0",
    name,
    type,
    parentId,
    assetPath: isMediaCueType(type) ? assetPath : undefined,
    midi: type === "midi" ? (midi ?? defaultMidiCueData()) : undefined,
    osc: type === "osc" ? (osc ?? defaultOscCueData()) : undefined,
    dmx: type === "dmx" || type === "lightFade" ? (dmx ?? defaultDmxCueData(fixtures)) : undefined,
    volume: isMediaCueType(type) ? 1 : undefined,
    pan: type === "audio" || type === "video" ? 0 : undefined,
    opacity: type === "video" || type === "image" ? 1 : undefined,
    fadeIn: type === "audio" || type === "video" ? 0 : undefined,
    fadeOut: type === "audio" || type === "video" ? 0 : undefined,
    inTime: isMediaCueType(type) ? 0 : undefined,
    outTime: undefined,
    waitDurationSec: type === "wait" ? 1 : undefined,
    ...(type === "lightFade" ? defaultFadeCueFields("lightFade") : {}),
  };
}

export function createCueEditorActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<
  ProjectState,
  | "addCue"
  | "addCues"
  | "addGroupCue"
  | "addSequenceCue"
  | "addStopCueForTarget"
  | "addFadeCue"
  | "addFadeCueForTarget"
  | "updateCue"
  | "removeCue"
  | "removeCueFromList"
  | "removeCuesUsingAsset"
  | "moveCueToGroup"
  | "moveCueToList"
  | "reparentCueRelative"
  | "reparentCueToListEnd"
  | "addSelectedCueToGroup"
  | "reorderCueRelative"
> {
  return {
    addCue: (opts) => {
      const [cue] = get().addCues([opts]);
      return cue ?? firstCueOrStub(getActiveCueListFromState(get()), opts.name, opts.type);
    },

    addCues: (items, listId) => {
      if (!canEditProject() || items.length === 0) return [];
      const targetListId = listId ?? getActiveCueListFromState(get()).id;
      const targetList = get().cueLists.find((l) => l.id === targetListId);
      if (!targetList) return [];
      let cues = targetList.cues;
      const created: Cue[] = [];

      for (const opts of items) {
        const parentId = resolveParentId(cues, opts.parentId);
        const cue = createCueFromOpts({ ...opts, parentId }, get().fixtures);
        cues = applyRenumber(appendCueInList(cues, cue));
        created.push(cue);
      }

      const last = created[created.length - 1];
      set({
        ...patchListById(get(), targetListId, () => ({
          cues,
          selectedCueIds: [last.id],
          selectionAnchorId: last.id,
        })),
      });
      return created;
    },

    addGroupCue: (opts = {}) => {
      const active = getActiveCueListFromState(get());
      if (!canEditProject()) {
        return firstCueOrStub(active, opts.name ?? "group", "group");
      }
      let parentId = opts.parentId;
      if (parentId) {
        const parent = active.cues.find((c) => c.id === parentId);
        if (!parent || !isContainerCue(parent)) parentId = undefined;
      }
      const cue = {
        id: randomId(),
        number: "0",
        name: opts.name ?? "group",
        type: "group" as const,
        parentId,
      };
      const next = applyRenumber(appendCueInList(active.cues, cue));
      set({
        ...patchActiveList(get(), () => ({
          cues: next,
          selectedCueIds: [cue.id],
          selectionAnchorId: cue.id,
        })),
      });
      return cue;
    },

    addSequenceCue: (opts = {}) => {
      const active = getActiveCueListFromState(get());
      if (!canEditProject()) {
        return firstCueOrStub(active, opts.name ?? "group", "sequence");
      }
      let parentId = opts.parentId;
      if (parentId) {
        const parent = active.cues.find((c) => c.id === parentId);
        if (!parent || !isContainerCue(parent)) parentId = undefined;
      }
      const cue = {
        id: randomId(),
        number: "0",
        name: opts.name ?? "group",
        type: "sequence" as const,
        parentId,
      };
      const next = applyRenumber(appendCueInList(active.cues, cue));
      set({
        ...patchActiveList(get(), () => ({
          cues: next,
          selectedCueIds: [cue.id],
          selectionAnchorId: cue.id,
        })),
      });
      return cue;
    },

    addStopCueForTarget: (targetId) => {
      if (!canEditProject()) return null;
      const active = getActiveCueListFromState(get());
      const { cues } = active;
      const target = cues.find((c) => c.id === targetId);
      if (!target || isStopCue(target) || !canStopTarget(target)) return null;

      const stopCue = {
        id: randomId(),
        number: "0",
        name: "Stop",
        type: "stop" as const,
        stopTargetId: targetId,
        parentId: target.parentId,
      };

      const idx = cues.findIndex((c) => c.id === targetId);
      const next = [...cues];
      next.splice(idx + 1, 0, stopCue);
      const renumbered = applyRenumber(next);
      set({
        ...patchActiveList(get(), () => ({
          cues: renumbered,
          selectedCueIds: [stopCue.id],
          selectionAnchorId: stopCue.id,
        })),
      });
      return stopCue;
    },

    addFadeCue: (fadeType) => {
      const active = getActiveCueListFromState(get());
      if (!canEditProject()) {
        return firstCueOrStub(active, fadeCueLabel(fadeType), fadeType);
      }
      const fadeCue = {
        id: randomId(),
        number: "0",
        name: fadeCueLabel(fadeType),
        type: fadeType,
        ...defaultFadeCueFields(fadeType),
        ...(fadeType === "lightFade" ? { dmx: defaultDmxCueData(get().fixtures) } : {}),
      };
      const next = applyRenumber(appendCueInList(active.cues, fadeCue));
      set({
        ...patchActiveList(get(), () => ({
          cues: next,
          selectedCueIds: [fadeCue.id],
          selectionAnchorId: fadeCue.id,
        })),
      });
      return fadeCue;
    },

    addFadeCueForTarget: (targetId, fadeType) => {
      if (!canEditProject()) return null;
      const active = getActiveCueListFromState(get());
      const { cues } = active;
      const target = cues.find((c) => c.id === targetId);
      if (!target || !isValidFadeTarget(fadeType, target)) return null;

      const fadeCue = {
        id: randomId(),
        number: "0",
        name:
          fadeType === "lightFade"
            ? `${fadeCueLabel(fadeType)} ${target.name}`
            : fadeCueLabel(fadeType),
        type: fadeType,
        parentId: target.parentId,
        ...defaultFadeCueFields(fadeType),
        ...(fadeType === "lightFade"
          ? {
              fadeTargetId: targetId,
              dmx:
                target.type === "dmx" && target.dmx
                  ? normalizeDmxCueData(target.dmx, get().fixtures)
                  : defaultDmxCueData(get().fixtures),
            }
          : { fadeTargetId: targetId }),
      };

      const idx = cues.findIndex((c) => c.id === targetId);
      const next = [...cues];
      next.splice(idx + 1, 0, fadeCue);
      const renumbered = applyRenumber(next);
      set({
        ...patchActiveList(get(), () => ({
          cues: renumbered,
          selectedCueIds: [fadeCue.id],
          selectionAnchorId: fadeCue.id,
        })),
      });
      return fadeCue;
    },

    updateCue: (id, patch) => {
      const isRuntimeLevelPatch =
        Object.keys(patch).length > 0 &&
        Object.keys(patch).every((key) => key === "volume" || key === "opacity" || key === "pan");
      if (!canEditProject() && !isRuntimeLevelPatch) return;
      const apply = () => {
        set((s) => ({
          ...patchActiveList(s, (list) => ({
            cues: applyRenumber(list.cues.map((c) => (c.id === id ? { ...c, ...patch } : c))),
          })),
        }));
      };
      if (isRuntimeLevelPatch && !canEditProject()) {
        runWithoutHistory(apply);
        return;
      }
      apply();
    },

    removeCue: (id) => {
      if (!canEditProject()) return;
      get().removeCueFromList(getActiveCueListFromState(get()).id, id);
    },

    removeCueFromList: (listId, id) => {
      if (!canEditProject()) return;
      const list = get().cueLists.find((l) => l.id === listId);
      if (!list) return;
      const toRemove = expandCueRemovalSet(list.cues, [id]);

      set((s) =>
        patchListById(s, listId, (current) => {
          const selectedCueIds = current.selectedCueIds.filter((cid) => !toRemove.has(cid));
          const anchorRemoved =
            current.selectionAnchorId && toRemove.has(current.selectionAnchorId);
          return {
            cues: applyRenumber(current.cues.filter((c) => !toRemove.has(c.id))),
            selectedCueIds,
            selectionAnchorId: anchorRemoved
              ? (selectedCueIds[0] ?? null)
              : current.selectionAnchorId,
          };
        }),
      );
    },

    removeCuesUsingAsset: (assetPath) => {
      if (!canEditProject()) return;
      set((s) => ({
        cueLists: s.cueLists.map((list) => {
          const matchingIds = list.cues.filter((c) => cueUsesAsset(c, assetPath)).map((c) => c.id);
          if (matchingIds.length === 0) return list;
          const toRemove = expandCueRemovalSet(list.cues, matchingIds);
          const selectedCueIds = list.selectedCueIds.filter((cid) => !toRemove.has(cid));
          const anchorRemoved = list.selectionAnchorId && toRemove.has(list.selectionAnchorId);
          return {
            ...list,
            cues: applyRenumber(list.cues.filter((c) => !toRemove.has(c.id))),
            selectedCueIds,
            selectionAnchorId: anchorRemoved ? (selectedCueIds[0] ?? null) : list.selectionAnchorId,
          };
        }),
      }));
    },

    moveCueToGroup: (cueId, groupId) => {
      if (!canEditProject()) return;
      const state = get();
      const found = findCueInLists(state.cueLists, cueId);
      if (!found) return;
      const { list, cue } = found;
      const { cues } = list;

      if (groupId) {
        const group = cues.find((c) => c.id === groupId);
        if (!group || !isContainerCue(group)) return;
        if (groupId === cueId) return;
        const isDescendant = (ancestorId: string, targetId: string): boolean =>
          getChildCues(cues, ancestorId).some(
            (c) => c.id === targetId || (isContainerCue(c) && isDescendant(c.id, targetId)),
          );
        if (isContainerCue(cue) && isDescendant(cueId, groupId)) return;
      }

      set((s) => ({
        ...patchListById(s, list.id, (current) => {
          const withParent = current.cues.map((c) =>
            c.id === cueId ? { ...c, parentId: groupId ?? undefined } : c,
          );
          const updated = withParent.find((c) => c.id === cueId);
          if (!updated) return { cues: applyRenumber(withParent) };
          const without = withParent.filter((c) => c.id !== cueId);
          return { cues: applyRenumber(appendCueInList(without, updated)) };
        }),
      }));
    },

    moveCueToList: (cueId, targetListId, place) => {
      if (!canEditProject()) return;
      const result = moveCueBetweenLists(get().cueLists, cueId, targetListId, place);
      if (!result) return;
      set({ cueLists: result.cueLists });
    },

    reparentCueRelative: (draggedId, targetId, place) => {
      if (!canEditProject()) return;
      const active = getActiveCueListFromState(get());
      const next = reparentCueRelativeList(active.cues, draggedId, targetId, place);
      if (!next) return;
      set({
        ...patchActiveList(get(), () => ({
          cues: applyRenumber(next),
        })),
      });
    },

    reparentCueToListEnd: (draggedId) => {
      if (!canEditProject()) return;
      const active = getActiveCueListFromState(get());
      const next = reparentCueToListEndList(active.cues, draggedId);
      if (!next) return;
      set({
        ...patchActiveList(get(), () => ({
          cues: applyRenumber(next),
        })),
      });
    },

    addSelectedCueToGroup: (groupId) => {
      const active = getActiveCueListFromState(get());
      const primaryId = getPrimarySelectedCueId(active.selectedCueIds);
      if (!primaryId || primaryId === groupId) return;
      get().moveCueToGroup(primaryId, groupId);
    },

    reorderCueRelative: (draggedId, targetId, place) => {
      if (!canEditProject()) return;
      const state = get();
      const draggedFound = findCueInLists(state.cueLists, draggedId);
      const targetFound = findCueInLists(state.cueLists, targetId);
      if (!draggedFound || !targetFound || draggedFound.list.id !== targetFound.list.id) return;
      const next = reorderSiblingCues(draggedFound.list.cues, draggedId, targetId, place);
      if (!next) return;
      set({
        ...patchListById(state, draggedFound.list.id, () => ({
          cues: applyRenumber(next),
        })),
      });
    },
  };
}
