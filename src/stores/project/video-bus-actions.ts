import type { StoreApi } from "zustand";
import { clamp01 } from "../../lib/clamp";
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
import { normalizeVideoOutputFrame, serializeVideoOutputFrame } from "../../lib/video-output-frame";
import {
  createVideoOutput,
  ensureMasterWindowOutput,
  normalizeVideoOutput,
  normalizeVideoOutputs,
} from "../../lib/video-outputs";
import type { VideoEffect } from "../../types/video-effect";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

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
  | "addVideoOutput"
  | "removeVideoOutput"
  | "updateVideoOutput"
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
      const buses = get().videoBuses;
      const bus = createVideoBus(buses, overrides);
      const nextBuses = [...buses, bus];
      const existingOutputs = get().videoOutputs;
      const pairedId = existingOutputs.some((entry) => entry.id === bus.id) ? undefined : bus.id;
      const output = normalizeVideoOutput(
        {
          id: pairedId ?? createVideoOutput(existingOutputs, nextBuses).id,
          name: bus.name,
          kind: "window",
          busId: bus.id,
        },
        nextBuses,
      );
      set((state) => ({
        videoBuses: [...state.videoBuses, bus],
        videoOutputs: [...state.videoOutputs, output],
      }));
      return bus;
    },

    removeVideoBus: (id) =>
      set((state) => ({
        videoBuses: normalizeVideoBuses(state.videoBuses.filter((bus) => bus.id !== id)),
        videoOutputs: normalizeVideoOutputs(
          state.videoOutputs.map((output) =>
            output.busId === id ? { ...output, busId: undefined } : output,
          ),
          state.videoBuses.filter((bus) => bus.id !== id),
        ),
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
          state.videoBuses.map((bus) => {
            if (bus.id !== id) return bus;
            return normalizeVideoBus({ ...bus, ...patch, id: bus.id });
          }),
        ),
      })),

    addVideoOutput: (overrides = {}) => {
      const output = createVideoOutput(get().videoOutputs, get().videoBuses, overrides);
      set((state) => ({ videoOutputs: [...state.videoOutputs, output] }));
      return output;
    },

    removeVideoOutput: (id) =>
      set((state) => {
        const remaining = state.videoOutputs.filter((output) => output.id !== id);
        return {
          videoOutputs: ensureMasterWindowOutput(
            remaining,
            state.videoBuses,
            state.masterVideoOutputName,
          ),
        };
      }),

    updateVideoOutput: (id, patch) =>
      set((state) => ({
        videoOutputs: normalizeVideoOutputs(
          state.videoOutputs.map((output) => {
            if (output.id !== id) return output;
            const next = { ...output, ...patch, id: output.id };
            if (patch.outputFrame !== undefined) {
              next.outputFrame = serializeVideoOutputFrame(
                normalizeVideoOutputFrame(patch.outputFrame),
              );
            }
            return normalizeVideoOutput(next, state.videoBuses);
          }),
          state.videoBuses,
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
