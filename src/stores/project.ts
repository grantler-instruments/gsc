import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  createCueList,
  findCueInLists,
  nextCueListName,
  type CueList,
} from "../lib/cue-lists";
import {
  getChildCues,
  isContainerCue,
  isFadeCue,
  isStopCue,
  appendCueInList,
  reorderSiblingCues,
  renumberCueList,
} from "../lib/cues";
import {
  defaultFadeCueFields,
  fadeCueLabel,
  isValidFadeTarget,
} from "../lib/fade";
import {
  buildParallelGroupFromSelection,
  getPrimarySelectedCueId,
} from "../lib/cue-selection";
import {
  collectCuesForCopy,
  getCueClipboard,
  prepareCuePaste,
  setCueClipboard,
} from "../lib/cue-clipboard";
import { setActiveProjectId } from "../lib/active-project-id";
import { cueListsToSnapshot, snapshotToCueLists } from "../lib/project-snapshot";
import { canEditProject } from "../lib/show-mode";
import { defaultMidiCueData } from "../lib/midi";
import { defaultOscCueData } from "../lib/osc";
import { buildNoteToCueMappings } from "../lib/midi-mapping";
import type {
  Cue,
  CueType,
  FadeCueType,
  MidiCueData,
  OscCueData,
  ProjectSnapshot,
} from "../types/cue";
import type { MidiMapping } from "../types/midi-mapping";

function isMediaCueType(type: CueType): boolean {
  return type === "audio" || type === "video" || type === "image";
}

function applyRenumber(cues: Cue[]): Cue[] {
  return renumberCueList(cues);
}

function getActiveList(state: {
  cueLists: CueList[];
  activeCueListId: string;
}): CueList {
  return (
    state.cueLists.find((l) => l.id === state.activeCueListId) ??
    state.cueLists[0]
  );
}

function patchActiveList(
  state: { cueLists: CueList[]; activeCueListId: string },
  patch: (list: CueList) => Partial<CueList>,
): { cueLists: CueList[] } {
  return {
    cueLists: state.cueLists.map((list) =>
      list.id === state.activeCueListId ? { ...list, ...patch(list) } : list,
    ),
  };
}

const initialList = createCueList("Main");
const initialProjectId = crypto.randomUUID();
setActiveProjectId(initialProjectId);

function firstCueOrStub(list: CueList, name: string, type: CueType): Cue {
  return list.cues[0] ?? { id: "", number: "0", name, type };
}

interface ProjectState {
  id: string;
  name: string;
  cueLists: CueList[];
  activeCueListId: string;
  midiMappings: MidiMapping[];
  addCue: (opts: {
    name: string;
    type: CueType;
    assetPath?: string;
    midi?: MidiCueData;
    osc?: OscCueData;
    parentId?: string;
  }) => Cue;
  addGroupCue: (opts?: { name?: string; parentId?: string }) => Cue;
  addSequenceCue: (opts?: { name?: string; parentId?: string }) => Cue;
  addStopCueForTarget: (targetId: string) => Cue | null;
  addFadeCue: (fadeType: FadeCueType) => Cue;
  addFadeCueForTarget: (
    targetId: string,
    fadeType: FadeCueType,
  ) => Cue | null;
  updateCue: (id: string, patch: Partial<Cue>) => void;
  removeCue: (id: string) => void;
  moveCueToGroup: (cueId: string, groupId: string | null) => void;
  addSelectedCueToGroup: (groupId: string) => void;
  reorderCueRelative: (
    draggedId: string,
    targetId: string,
    place: "before" | "after",
  ) => void;
  selectCue: (id: string | null) => void;
  toggleSelectCue: (id: string) => void;
  selectCueRange: (id: string, visibleOrder: string[]) => void;
  groupSelectedCues: () => Cue | null;
  copySelectedCues: () => boolean;
  pasteSelectedCues: () => boolean;
  duplicateSelectedCues: () => boolean;
  addCueList: (name?: string) => CueList;
  removeCueList: (listId: string) => void;
  renameCueList: (listId: string, name: string) => void;
  setActiveCueList: (listId: string) => void;
  setName: (name: string) => void;
  addMidiMapping: (mapping: Omit<MidiMapping, "id">) => MidiMapping;
  removeMidiMapping: (id: string) => void;
  updateMidiMapping: (id: string, patch: Partial<MidiMapping>) => void;
  setMidiMappings: (mappings: MidiMapping[]) => void;
  autoMapNotesToCues: (startNote?: number) => void;
  loadSnapshot: (snap: ProjectSnapshot) => void;
  getSnapshot: () => ProjectSnapshot;
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      id: initialProjectId,
      name: "Untitled Show",
      cueLists: [initialList],
      activeCueListId: initialList.id,
      midiMappings: [],

      addCue: ({ name, type, assetPath, midi, osc, parentId }) => {
        if (!canEditProject()) {
          return firstCueOrStub(getActiveList(get()), name, type);
        }
        const active = getActiveList(get());
        let cues = active.cues;
        if (parentId) {
          const parent = cues.find((c) => c.id === parentId);
          if (!parent || !isContainerCue(parent)) parentId = undefined;
        }

        const cue: Cue = {
          id: crypto.randomUUID(),
          number: "0",
          name,
          type,
          parentId,
          assetPath: isMediaCueType(type) ? assetPath : undefined,
          midi: type === "midi" ? (midi ?? defaultMidiCueData()) : undefined,
          osc: type === "osc" ? (osc ?? defaultOscCueData()) : undefined,
          volume: isMediaCueType(type) ? 1 : undefined,
          opacity: type === "video" || type === "image" ? 1 : undefined,
          fadeIn: type === "audio" || type === "video" ? 0 : undefined,
          fadeOut: type === "audio" || type === "video" ? 0 : undefined,
          inTime: isMediaCueType(type) ? 0 : undefined,
          outTime: undefined,
          waitDurationSec: type === "wait" ? 1 : undefined,
        };
        const next = applyRenumber(appendCueInList(cues, cue));
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
        const active = getActiveList(get());
        if (!canEditProject()) {
          return firstCueOrStub(active, opts.name ?? "group", "group");
        }
        let parentId = opts.parentId;
        if (parentId) {
          const parent = active.cues.find((c) => c.id === parentId);
          if (!parent || !isContainerCue(parent)) parentId = undefined;
        }
        const cue: Cue = {
          id: crypto.randomUUID(),
          number: "0",
          name: opts.name ?? "group",
          type: "group",
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
        const active = getActiveList(get());
        if (!canEditProject()) {
          return firstCueOrStub(active, opts.name ?? "group", "sequence");
        }
        let parentId = opts.parentId;
        if (parentId) {
          const parent = active.cues.find((c) => c.id === parentId);
          if (!parent || !isContainerCue(parent)) parentId = undefined;
        }
        const cue: Cue = {
          id: crypto.randomUUID(),
          number: "0",
          name: opts.name ?? "group",
          type: "sequence",
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
        const active = getActiveList(get());
        const { cues } = active;
        const target = cues.find((c) => c.id === targetId);
        if (!target || isStopCue(target)) return null;

        const stopCue: Cue = {
          id: crypto.randomUUID(),
          number: "0",
          name: "Stop",
          type: "stop",
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
        const active = getActiveList(get());
        if (!canEditProject()) {
          return firstCueOrStub(active, fadeCueLabel(fadeType), fadeType);
        }
        const fadeCue: Cue = {
          id: crypto.randomUUID(),
          number: "0",
          name: fadeCueLabel(fadeType),
          type: fadeType,
          ...defaultFadeCueFields(fadeType),
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
        const active = getActiveList(get());
        const { cues } = active;
        const target = cues.find((c) => c.id === targetId);
        if (!target || !isValidFadeTarget(fadeType, target)) return null;

        const fadeCue: Cue = {
          id: crypto.randomUUID(),
          number: "0",
          name: fadeCueLabel(fadeType),
          type: fadeType,
          fadeTargetId: targetId,
          parentId: target.parentId,
          ...defaultFadeCueFields(fadeType),
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
        if (!canEditProject()) return;
        set((s) => ({
          ...patchActiveList(s, (list) => ({
            cues: applyRenumber(
              list.cues.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            ),
          })),
        }));
      },

      removeCue: (id) => {
        if (!canEditProject()) return;
        const active = getActiveList(get());
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
            const selectedCueIds = list.selectedCueIds.filter(
              (cid) => !toRemove.has(cid),
            );
            const anchorRemoved =
              list.selectionAnchorId && toRemove.has(list.selectionAnchorId);
            return {
              cues: applyRenumber(
                list.cues.filter((c) => !toRemove.has(c.id)),
              ),
              selectedCueIds,
              selectionAnchorId: anchorRemoved
                ? (selectedCueIds[0] ?? null)
                : list.selectionAnchorId,
            };
          }),
        );
      },

      moveCueToGroup: (cueId, groupId) => {
        if (!canEditProject()) return;
        const active = getActiveList(get());
        const { cues } = active;
        const cue = cues.find((c) => c.id === cueId);
        if (!cue) return;

        if (groupId) {
          const group = cues.find((c) => c.id === groupId);
          if (!group || !isContainerCue(group)) return;
          if (groupId === cueId) return;
          const isDescendant = (ancestorId: string, targetId: string): boolean =>
            getChildCues(cues, ancestorId).some(
              (c) =>
                c.id === targetId ||
                (isContainerCue(c) && isDescendant(c.id, targetId)),
            );
          if (isContainerCue(cue) && isDescendant(cueId, groupId)) return;
        }

        set((s) => ({
          ...patchActiveList(s, (list) => ({
            cues: applyRenumber(
              list.cues.map((c) =>
                c.id === cueId
                  ? { ...c, parentId: groupId ?? undefined }
                  : c,
              ),
            ),
          })),
        }));
      },

      addSelectedCueToGroup: (groupId) => {
        const active = getActiveList(get());
        const primaryId = getPrimarySelectedCueId(active.selectedCueIds);
        if (!primaryId || primaryId === groupId) return;
        get().moveCueToGroup(primaryId, groupId);
      },

      reorderCueRelative: (draggedId, targetId, place) => {
        if (!canEditProject()) return;
        const active = getActiveList(get());
        const next = reorderSiblingCues(
          active.cues,
          draggedId,
          targetId,
          place,
        );
        if (!next) return;
        set({
          ...patchActiveList(get(), () => ({
            cues: applyRenumber(next),
          })),
        });
      },

      selectCue: (id) =>
        set((s) => ({
          ...patchActiveList(s, () => ({
            selectedCueIds: id ? [id] : [],
            selectionAnchorId: id,
          })),
        })),

      toggleSelectCue: (id) =>
        set((s) => ({
          ...patchActiveList(s, (list) => {
            const has = list.selectedCueIds.includes(id);
            const selectedCueIds = has
              ? list.selectedCueIds.filter((x) => x !== id)
              : [...list.selectedCueIds, id];
            return { selectedCueIds, selectionAnchorId: id };
          }),
        })),

      selectCueRange: (id, visibleOrder) => {
        const active = getActiveList(get());
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
        const active = getActiveList(get());
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
        const active = getActiveList(get());
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

        const active = getActiveList(get());
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
        const active = getActiveList(get());
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

      addCueList: (name) => {
        if (!canEditProject()) return getActiveList(get());
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
          activeCueListId:
            s.activeCueListId === listId
              ? nextLists[0].id
              : s.activeCueListId,
        }));
      },

      renameCueList: (listId, name) => {
        if (!canEditProject()) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({
          cueLists: s.cueLists.map((l) =>
            l.id === listId ? { ...l, name: trimmed } : l,
          ),
        }));
      },

      setActiveCueList: (listId) => {
        if (get().cueLists.some((l) => l.id === listId)) {
          set({ activeCueListId: listId });
        }
      },

      setName: (name) => {
        if (!canEditProject()) return;
        set({ name });
      },

      addMidiMapping: (mapping) => {
        const entry: MidiMapping = { ...mapping, id: crypto.randomUUID() };
        set((s) => ({ midiMappings: [...s.midiMappings, entry] }));
        return entry;
      },

      removeMidiMapping: (id) =>
        set((s) => ({
          midiMappings: s.midiMappings.filter((m) => m.id !== id),
        })),

      updateMidiMapping: (id, patch) =>
        set((s) => ({
          midiMappings: s.midiMappings.map((m) =>
            m.id === id ? { ...m, ...patch } : m,
          ),
        })),

      setMidiMappings: (midiMappings) => set({ midiMappings }),

      autoMapNotesToCues: (startNote = 36) => {
        const active = getActiveList(get());
        set({
          midiMappings: buildNoteToCueMappings(active.cues, startNote),
        });
      },

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
    }),
    { name: "ProjectStore" },
  ),
);

export function useActiveCueList(): CueList {
  return useProjectStore((s) => getActiveList(s));
}

export function useProjectCues(): Cue[] {
  return useProjectStore((s) => getActiveList(s).cues);
}

export function findProjectCue(
  cueLists: CueList[],
  cueId: string,
): Cue | undefined {
  return findCueInLists(cueLists, cueId)?.cue;
}
