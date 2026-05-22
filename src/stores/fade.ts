import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { handleSequenceFadeCueCompleted } from "../lib/sequence-runner";

export type FadeProperty = "opacity" | "volume";

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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getFadeLevel(fade: ActivePropertyFade, nowMs: number): number {
  const elapsedSec = (nowMs - fade.startedAtMs) / 1000;
  const t = fade.durationSec > 0 ? elapsedSec / fade.durationSec : 1;
  if (t >= 1) return fade.to;
  if (t <= 0) return fade.from;
  return fade.from + (fade.to - fade.from) * t;
}

export function isFadeComplete(fade: ActivePropertyFade, nowMs: number): boolean {
  return (nowMs - fade.startedAtMs) / 1000 >= fade.durationSec;
}

interface FadeState {
  fadesByTargetId: Record<string, ActivePropertyFade>;
  /** Bumped each animation frame while fades are running (drives UI refresh). */
  frameMs: number;
  startFade: (fade: ActivePropertyFade) => void;
  clearFade: (targetId: string) => void;
  clearFades: (targetIds: string[]) => void;
  tick: (nowMs: number) => void;
}

export const useFadeStore = create<FadeState>()(
  devtools(
    (set, get) => ({
      fadesByTargetId: {},
      frameMs: 0,

      startFade: (fade) =>
        set((s) => ({
          fadesByTargetId: { ...s.fadesByTargetId, [fade.targetId]: fade },
          frameMs: performance.now(),
        })),

      clearFade: (targetId) =>
        set((s) => {
          if (!s.fadesByTargetId[targetId]) return s;
          const next = { ...s.fadesByTargetId };
          delete next[targetId];
          return { fadesByTargetId: next };
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

      tick: (nowMs) => {
        const fades = get().fadesByTargetId;
        const ids = Object.keys(fades);
        if (ids.length === 0) return;

        const next = { ...fades };
        const completedFadeCueIds: string[] = [];

        for (const id of ids) {
          const fade = fades[id];
          if (!isFadeComplete(fade, nowMs)) continue;

          delete next[id];

          if (fade.sourceFadeCueId) {
            completedFadeCueIds.push(fade.sourceFadeCueId);
          }
        }

        for (const fadeCueId of completedFadeCueIds) {
          handleSequenceFadeCueCompleted(fadeCueId);
        }

        set({ fadesByTargetId: next, frameMs: nowMs });
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
  if (!fade || fade.property !== "opacity") {
    return clamp01(storedOpacity);
  }
  return clamp01(getFadeLevel(fade, nowMs));
}

export function resolveEffectiveVolume(
  cueId: string,
  storedVolume: number,
  nowMs = performance.now(),
): number {
  const fade = useFadeStore.getState().fadesByTargetId[cueId];
  if (!fade || fade.property !== "volume") {
    return clamp01(storedVolume);
  }
  return clamp01(getFadeLevel(fade, nowMs));
}
