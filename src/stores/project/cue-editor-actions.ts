import type { StoreApi } from "zustand";
import { getPrimarySelectedCueId } from "../../lib/cue-selection";
import {
  appendCueInList,
  canStopTarget,
  getChildCues,
  isContainerCue,
  isFadeCue,
  isStopCue,
  reorderSiblingCues,
} from "../../lib/cues";
import { defaultDmxCueData, normalizeDmxCueData } from "../../lib/dmx";
import { defaultFadeCueFields, fadeCueLabel, isValidFadeTarget } from "../../lib/fade";
import { defaultMidiCueData } from "../../lib/midi";
import { defaultOscCueData } from "../../lib/osc";
import { runWithoutHistory } from "../../lib/project-history";
import { canEditProject } from "../../lib/show-mode";
import type { Cue } from "../../types/cue";
import {
  applyRenumber,
  firstCueOrStub,
  getActiveCueListFromState,
  isMediaCueType,
  patchActiveList,
} from "./helpers";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

export function createCueEditorActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<
  ProjectState,
  | "addCue"
  | "addGroupCue"
  | "addSequenceCue"
  | "addStopCueForTarget"
  | "addFadeCue"
  | "addFadeCueForTarget"
  | "updateCue"
  | "removeCue"
  | "moveCueToGroup"
  | "addSelectedCueToGroup"
  | "reorderCueRelative"
> {
  return {
    addCue: ({ name, type, assetPath, midi, osc, dmx, parentId }) => {
      if (!canEditProject()) {
        return firstCueOrStub(getActiveCueListFromState(get()), name, type);
      }
      const active = getActiveCueListFromState(get());
      let resolvedParentId = parentId;
      if (resolvedParentId) {
        const parent = active.cues.find((c) => c.id === resolvedParentId);
        if (!parent || !isContainerCue(parent)) resolvedParentId = undefined;
      }

      const cue: Cue = {
        id: crypto.randomUUID(),
        number: "0",
        name,
        type,
        parentId: resolvedParentId,
        assetPath: isMediaCueType(type) ? assetPath : undefined,
        midi: type === "midi" ? (midi ?? defaultMidiCueData()) : undefined,
        osc: type === "osc" ? (osc ?? defaultOscCueData()) : undefined,
        dmx:
          type === "dmx" || type === "lightFade"
            ? (dmx ?? defaultDmxCueData(get().fixtures))
            : undefined,
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
        id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
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
      const active = getActiveCueListFromState(get());
      const { cues } = active;
      const toRemove = new Set<string>([id]);
      const collect = (cueId: string) => {
        for (const child of getChildCues(cues, cueId)) {
          toRemove.add(child.id);
          if (isContainerCue(child)) collect(child.id);
        }
      };
      const target = cues.find((c) => c.id === id);
      if (target && isContainerCue(target)) collect(id);
      for (const c of cues) {
        if (isStopCue(c) && c.stopTargetId === id) toRemove.add(c.id);
        if (isFadeCue(c) && c.fadeTargetId === id) toRemove.add(c.id);
      }

      set((s) =>
        patchActiveList(s, (list) => {
          const selectedCueIds = list.selectedCueIds.filter((cid) => !toRemove.has(cid));
          const anchorRemoved = list.selectionAnchorId && toRemove.has(list.selectionAnchorId);
          return {
            cues: applyRenumber(list.cues.filter((c) => !toRemove.has(c.id))),
            selectedCueIds,
            selectionAnchorId: anchorRemoved ? (selectedCueIds[0] ?? null) : list.selectionAnchorId,
          };
        }),
      );
    },

    moveCueToGroup: (cueId, groupId) => {
      if (!canEditProject()) return;
      const active = getActiveCueListFromState(get());
      const { cues } = active;
      const cue = cues.find((c) => c.id === cueId);
      if (!cue) return;

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
        ...patchActiveList(s, (list) => ({
          cues: applyRenumber(
            list.cues.map((c) => (c.id === cueId ? { ...c, parentId: groupId ?? undefined } : c)),
          ),
        })),
      }));
    },

    addSelectedCueToGroup: (groupId) => {
      const active = getActiveCueListFromState(get());
      const primaryId = getPrimarySelectedCueId(active.selectedCueIds);
      if (!primaryId || primaryId === groupId) return;
      get().moveCueToGroup(primaryId, groupId);
    },

    reorderCueRelative: (draggedId, targetId, place) => {
      if (!canEditProject()) return;
      const active = getActiveCueListFromState(get());
      const next = reorderSiblingCues(active.cues, draggedId, targetId, place);
      if (!next) return;
      set({
        ...patchActiveList(get(), () => ({
          cues: applyRenumber(next),
        })),
      });
    },
  };
}
