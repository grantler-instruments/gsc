import type { StoreApi } from "zustand";
import { canEditProject } from "../../lib/show-mode";
import {
  createVideoBus,
  normalizeMasterVideoOutputName,
  normalizeVideoBus,
  normalizeVideoBuses,
} from "../../lib/video-buses";
import {
  busHasVideoEffectType,
  createDefaultVideoBusEffect,
  normalizeVideoEffects,
  patchVideoBusEffect,
  reorderVideoEffects,
} from "../../lib/video-effects";
import type { VideoEffect } from "../../types/video-effect";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function serializeMasterEffects(effects: VideoEffect[]): VideoEffect[] | undefined {
  const normalized = normalizeVideoEffects(effects);
  return normalized.length > 0 ? normalized : undefined;
}

function updateVideoBusEffects(
  buses: ProjectState["videoBuses"],
  busId: string,
  updater: (effects: VideoEffect[]) => VideoEffect[],
): ProjectState["videoBuses"] {
  return buses.map((bus) => {
    if (bus.id !== busId) return bus;
    const effects = updater(bus.effects ?? []);
    return normalizeVideoBus({
      ...bus,
      effects: effects.length > 0 ? effects : undefined,
    });
  });
}

function updateMasterVideoOutputEffects(
  effects: VideoEffect[] | undefined,
  updater: (effects: VideoEffect[]) => VideoEffect[],
): VideoEffect[] | undefined {
  return serializeMasterEffects(updater(effects ?? []));
}

export function createVideoBusActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<
  ProjectState,
  | "addVideoBus"
  | "removeVideoBus"
  | "updateVideoBus"
  | "updateMasterVideoOutputName"
  | "updateMasterVideoOutputOpacity"
  | "addVideoBusEffect"
  | "updateVideoBusEffect"
  | "removeVideoBusEffect"
  | "reorderVideoBusEffectRelative"
  | "addMasterVideoOutputEffect"
  | "updateMasterVideoOutputEffect"
  | "removeMasterVideoOutputEffect"
  | "reorderMasterVideoOutputEffectRelative"
> {
  return {
    addVideoBus: (overrides = {}) => {
      const bus = createVideoBus(get().videoBuses, overrides);
      set((state) => ({ videoBuses: [...state.videoBuses, bus] }));
      return bus;
    },

    removeVideoBus: (id) =>
      set((state) => ({
        videoBuses: normalizeVideoBuses(state.videoBuses.filter((bus) => bus.id !== id)),
        cueLists: state.cueLists.map((list) => ({
          ...list,
          cues: list.cues.map((cue) =>
            cue.videoBusId === id ? { ...cue, videoBusId: undefined } : cue,
          ),
        })),
      })),

    updateVideoBus: (id, patch) =>
      set((state) => ({
        videoBuses: normalizeVideoBuses(
          state.videoBuses.map((bus) => (bus.id === id ? { ...bus, ...patch, id: bus.id } : bus)),
        ),
      })),

    updateMasterVideoOutputName: (name) =>
      set({ masterVideoOutputName: normalizeMasterVideoOutputName(name) }),

    updateMasterVideoOutputOpacity: (opacity) =>
      set({ masterVideoOutputOpacity: clamp01(opacity) }),

    addVideoBusEffect: (busId, type) => {
      const bus = get().videoBuses.find((entry) => entry.id === busId);
      if (!bus || busHasVideoEffectType(bus, type)) return null;

      const effect = createDefaultVideoBusEffect(type);
      set((state) => ({
        videoBuses: updateVideoBusEffects(state.videoBuses, busId, (effects) => [
          ...effects,
          effect,
        ]),
      }));
      return effect;
    },

    updateVideoBusEffect: (busId, effectId, patch) =>
      set((state) => ({
        videoBuses: updateVideoBusEffects(state.videoBuses, busId, (effects) =>
          effects.map((effect) => {
            if (effect.id !== effectId) return effect;
            return patchVideoBusEffect(effect, patch);
          }),
        ),
      })),

    removeVideoBusEffect: (busId, effectId) =>
      set((state) => ({
        videoBuses: updateVideoBusEffects(state.videoBuses, busId, (effects) =>
          effects.filter((effect) => effect.id !== effectId),
        ),
      })),

    reorderVideoBusEffectRelative: (busId, draggedId, targetId, place) => {
      if (!canEditProject()) return;
      const bus = get().videoBuses.find((entry) => entry.id === busId);
      if (!bus) return;
      const next = reorderVideoEffects(bus.effects ?? [], draggedId, targetId, place);
      if (!next) return;
      set((state) => ({
        videoBuses: updateVideoBusEffects(state.videoBuses, busId, () => next),
      }));
    },

    addMasterVideoOutputEffect: (type) => {
      const state = get();
      if (busHasVideoEffectType({ effects: state.masterVideoOutputEffects }, type)) return null;

      const effect = createDefaultVideoBusEffect(type);
      set((current) => ({
        masterVideoOutputEffects: updateMasterVideoOutputEffects(
          current.masterVideoOutputEffects,
          (effects) => [...effects, effect],
        ),
      }));
      return effect;
    },

    updateMasterVideoOutputEffect: (effectId, patch) =>
      set((state) => ({
        masterVideoOutputEffects: updateMasterVideoOutputEffects(
          state.masterVideoOutputEffects,
          (effects) =>
            effects.map((effect) => {
              if (effect.id !== effectId) return effect;
              return patchVideoBusEffect(effect, patch);
            }),
        ),
      })),

    removeMasterVideoOutputEffect: (effectId) =>
      set((state) => ({
        masterVideoOutputEffects: updateMasterVideoOutputEffects(
          state.masterVideoOutputEffects,
          (effects) => effects.filter((effect) => effect.id !== effectId),
        ),
      })),

    reorderMasterVideoOutputEffectRelative: (draggedId, targetId, place) => {
      if (!canEditProject()) return;
      const next = reorderVideoEffects(
        get().masterVideoOutputEffects ?? [],
        draggedId,
        targetId,
        place,
      );
      if (!next) return;
      set({ masterVideoOutputEffects: serializeMasterEffects(next) });
    },
  };
}
