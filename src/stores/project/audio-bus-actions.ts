import type { StoreApi } from "zustand";
import { createAudioBus, normalizeAudioBus } from "../../lib/audio-buses";
import {
  busHasEffectType,
  createDefaultBusEffect,
  mergeEffectParams,
  normalizeAudioEffect,
} from "../../lib/audio-effects";
import type { AudioEffect } from "../../types/audio-effect";
import type { ProjectState } from "./types";

type ProjectStore = StoreApi<ProjectState>;

function updateBusEffects(
  buses: ProjectState["audioBuses"],
  busId: string,
  updater: (effects: AudioEffect[]) => AudioEffect[],
): ProjectState["audioBuses"] {
  return buses.map((bus) => {
    if (bus.id !== busId) return bus;
    const effects = updater(bus.effects ?? []);
    return normalizeAudioBus({
      ...bus,
      effects: effects.length > 0 ? effects : undefined,
    });
  });
}

export function createAudioBusActions(
  set: ProjectStore["setState"],
  get: ProjectStore["getState"],
): Pick<
  ProjectState,
  | "addAudioBus"
  | "removeAudioBus"
  | "updateAudioBus"
  | "addBusEffect"
  | "updateBusEffect"
  | "removeBusEffect"
> {
  return {
    addAudioBus: (overrides = {}) => {
      const bus = createAudioBus(get().audioBuses, overrides);
      set((state) => ({ audioBuses: [...state.audioBuses, bus] }));
      return bus;
    },

    removeAudioBus: (id) =>
      set((state) => ({
        audioBuses: state.audioBuses.filter((bus) => bus.id !== id),
        cueLists: state.cueLists.map((list) => ({
          ...list,
          cues: list.cues.map((cue) =>
            cue.audioBusId === id ? { ...cue, audioBusId: undefined } : cue,
          ),
        })),
      })),

    updateAudioBus: (id, patch) =>
      set((state) => ({
        audioBuses: state.audioBuses.map((bus) =>
          bus.id === id ? normalizeAudioBus({ ...bus, ...patch, id: bus.id }) : bus,
        ),
      })),

    addBusEffect: (busId, type) => {
      const bus = get().audioBuses.find((entry) => entry.id === busId);
      if (!bus || busHasEffectType(bus, type)) return null;

      const effect = createDefaultBusEffect(type);
      set((state) => ({
        audioBuses: updateBusEffects(state.audioBuses, busId, (effects) => [...effects, effect]),
      }));
      return effect;
    },

    updateBusEffect: (busId, effectId, patch) =>
      set((state) => ({
        audioBuses: updateBusEffects(state.audioBuses, busId, (effects) =>
          effects.map((effect) => {
            if (effect.id !== effectId) return effect;
            const enabled = patch.enabled ?? effect.enabled;

            switch (effect.type) {
              case "delay":
                return normalizeAudioEffect({
                  id: effect.id,
                  type: "delay",
                  enabled,
                  params: patch.params ? mergeEffectParams(effect, patch.params) : effect.params,
                });
              case "reverb":
                return normalizeAudioEffect({
                  id: effect.id,
                  type: "reverb",
                  enabled,
                  params: patch.params ? mergeEffectParams(effect, patch.params) : effect.params,
                });
              default:
                return normalizeAudioEffect({
                  id: effect.id,
                  type: "eq",
                  enabled,
                  params: patch.params ? mergeEffectParams(effect, patch.params) : effect.params,
                });
            }
          }),
        ),
      })),

    removeBusEffect: (busId, effectId) =>
      set((state) => ({
        audioBuses: updateBusEffects(state.audioBuses, busId, (effects) =>
          effects.filter((effect) => effect.id !== effectId),
        ),
      })),
  };
}
