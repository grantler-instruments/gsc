import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { DmxFadePlan } from "../lib/dmx-fade";
import { handleSequenceFadeCueCompleted } from "../lib/sequence-runner";
import type { DmxCueData } from "../types/cue";

export type FadeProperty = "opacity" | "volume" | "pan";

export type RuntimePropertyLevels = Partial<Record<FadeProperty, number>>;

export interface ActivePropertyFade {
  targetId: string;
  property: FadeProperty;
  from: number;
  to: number;
  startedAtMs: number;
  durationSec: number;
  /** Fade utility cue that started this run (sequence advance). */
  sourceFadeCueId?: string;
}

export interface ActiveDmxFade {
  fadeCueId: string;
  startedAtMs: number;
  durationSec: number;
  plan: DmxFadePlan;
  endDmx: DmxCueData;
  sourceFadeCueId?: string;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampPan(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function clampFadeLevel(property: FadeProperty, value: number): number {
  if (property === "pan") return clampPan(value);
  return clamp01(value);
}

export function getFadeLevel(fade: ActivePropertyFade, nowMs: number): number {
  const elapsedSec = (nowMs - fade.startedAtMs) / 1000;
  const t = fade.durationSec > 0 ? elapsedSec / fade.durationSec : 1;
  if (t >= 1) return fade.to;
  if (t <= 0) return fade.from;
  return fade.from + (fade.to - fade.from) * t;
}

export function getDmxFadeProgress(fade: ActiveDmxFade, nowMs: number): number {
  const elapsedSec = (nowMs - fade.startedAtMs) / 1000;
  return fade.durationSec > 0 ? elapsedSec / fade.durationSec : 1;
}

export function isFadeComplete(fade: ActivePropertyFade, nowMs: number): boolean {
  return (nowMs - fade.startedAtMs) / 1000 >= fade.durationSec;
}

export function isDmxFadeComplete(fade: ActiveDmxFade, nowMs: number): boolean {
  return (nowMs - fade.startedAtMs) / 1000 >= fade.durationSec;
}

interface FadeState {
  fadesByTargetId: Record<string, ActivePropertyFade>;
  dmxFadesByFadeCueId: Record<string, ActiveDmxFade>;
  /** Playback-only volume/opacity after a fade completes (cleared on re-GO). */
  runtimeLevelsByTargetId: Record<string, RuntimePropertyLevels>;
  /** Bumped each animation frame while fades are running (drives UI refresh). */
  frameMs: number;
  startFade: (fade: ActivePropertyFade) => void;
  startDmxFade: (fade: ActiveDmxFade) => void;
  setRuntimeLevel: (targetId: string, property: FadeProperty, level: number) => void;
  clearFade: (targetId: string) => void;
  clearDmxFade: (fadeCueId: string) => void;
  clearFades: (targetIds: string[]) => void;
  clearRuntimeLevels: (targetIds: string[]) => void;
  clearAllFades: () => void;
  tick: (nowMs: number) => void;
  completeDmxFade: (fadeCueId: string, nowMs: number) => void;
}

export const useFadeStore = create<FadeState>()(
  devtools(
    (set, get) => ({
      fadesByTargetId: {},
      dmxFadesByFadeCueId: {},
      runtimeLevelsByTargetId: {},
      frameMs: 0,

      startFade: (fade) =>
        set((s) => ({
          fadesByTargetId: { ...s.fadesByTargetId, [fade.targetId]: fade },
          frameMs: performance.now(),
        })),

      startDmxFade: (fade) =>
        set((s) => ({
          dmxFadesByFadeCueId: {
            ...s.dmxFadesByFadeCueId,
            [fade.fadeCueId]: fade,
          },
          frameMs: performance.now(),
        })),

      setRuntimeLevel: (targetId, property, level) =>
        set((s) => ({
          runtimeLevelsByTargetId: {
            ...s.runtimeLevelsByTargetId,
            [targetId]: {
              ...s.runtimeLevelsByTargetId[targetId],
              [property]: clampFadeLevel(property, level),
            },
          },
        })),

      clearFade: (targetId) =>
        set((s) => {
          if (!s.fadesByTargetId[targetId]) return s;
          const next = { ...s.fadesByTargetId };
          delete next[targetId];
          return { fadesByTargetId: next };
        }),

      clearDmxFade: (fadeCueId) =>
        set((s) => {
          if (!s.dmxFadesByFadeCueId[fadeCueId]) return s;
          const next = { ...s.dmxFadesByFadeCueId };
          delete next[fadeCueId];
          return { dmxFadesByFadeCueId: next };
        }),

      clearFades: (targetIds) =>
        set((s) => {
          if (targetIds.length === 0) return s;
          const next = { ...s.fadesByTargetId };
          let changed = false;
          for (const id of targetIds) {
            if (next[id]) {
              delete next[id];
              changed = true;
            }
          }
          return changed ? { fadesByTargetId: next } : s;
        }),

      clearRuntimeLevels: (targetIds) =>
        set((s) => {
          if (targetIds.length === 0) return s;
          const next = { ...s.runtimeLevelsByTargetId };
          let changed = false;
          for (const id of targetIds) {
            if (next[id]) {
              delete next[id];
              changed = true;
            }
          }
          return changed ? { runtimeLevelsByTargetId: next } : s;
        }),

      clearAllFades: () =>
        set({
          fadesByTargetId: {},
          dmxFadesByFadeCueId: {},
          runtimeLevelsByTargetId: {},
          frameMs: 0,
        }),

      completeDmxFade: (fadeCueId, nowMs) => {
        const fade = get().dmxFadesByFadeCueId[fadeCueId];
        if (!fade) return;
        const next = { ...get().dmxFadesByFadeCueId };
        delete next[fadeCueId];
        set({ dmxFadesByFadeCueId: next, frameMs: nowMs });
        if (fade.sourceFadeCueId) {
          handleSequenceFadeCueCompleted(fade.sourceFadeCueId);
        }
      },

      tick: (nowMs) => {
        const fades = get().fadesByTargetId;
        const ids = Object.keys(fades);
        if (ids.length === 0) return;

        const completedFadeCueIds: string[] = [];
        let next: typeof fades | undefined;

        for (const id of ids) {
          const fade = fades[id];
          if (!isFadeComplete(fade, nowMs)) continue;

          get().setRuntimeLevel(fade.targetId, fade.property, fade.to);
          if (!next) next = { ...fades };
          delete next[id];

          if (fade.sourceFadeCueId) {
            completedFadeCueIds.push(fade.sourceFadeCueId);
          }
        }

        for (const fadeCueId of completedFadeCueIds) {
          handleSequenceFadeCueCompleted(fadeCueId);
        }

        if (next) {
          set({ fadesByTargetId: next, frameMs: nowMs });
        } else {
          set({ frameMs: nowMs });
        }
      },
    }),
    { name: "FadeStore" },
  ),
);

export function resolveEffectiveOpacity(
  cueId: string,
  storedOpacity: number,
  nowMs = performance.now(),
): number {
  const fade = useFadeStore.getState().fadesByTargetId[cueId];
  if (fade?.property === "opacity") {
    return clamp01(getFadeLevel(fade, nowMs));
  }
  const runtime = useFadeStore.getState().runtimeLevelsByTargetId[cueId]?.opacity;
  if (runtime !== undefined) {
    return clamp01(runtime);
  }
  return clamp01(storedOpacity);
}

export function resolveEffectiveVolume(
  cueId: string,
  storedVolume: number,
  nowMs = performance.now(),
): number {
  const fade = useFadeStore.getState().fadesByTargetId[cueId];
  if (fade?.property === "volume") {
    return clamp01(getFadeLevel(fade, nowMs));
  }
  const runtime = useFadeStore.getState().runtimeLevelsByTargetId[cueId]?.volume;
  if (runtime !== undefined) {
    return clamp01(runtime);
  }
  return clamp01(storedVolume);
}

export function resolveEffectivePan(
  cueId: string,
  storedPan: number,
  nowMs = performance.now(),
): number {
  const fade = useFadeStore.getState().fadesByTargetId[cueId];
  if (fade?.property === "pan") {
    return clampPan(getFadeLevel(fade, nowMs));
  }
  const runtime = useFadeStore.getState().runtimeLevelsByTargetId[cueId]?.pan;
  if (runtime !== undefined) {
    return clampPan(runtime);
  }
  return clampPan(storedPan);
}
