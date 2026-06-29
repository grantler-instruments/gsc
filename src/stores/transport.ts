import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { getMediaDurationSec } from "../lib/media-duration";
import { goAtMsForSeekPosition } from "../lib/playback-seek";
import { clearSequenceTimers } from "../lib/sequence-timers";
import type { Cue } from "../types/cue";
import { useFadeStore } from "./fade";
import { getActiveCueListFromState, useProjectStore } from "./project";

/**
 * Where a sequence was launched from. Main-list sequences cancel each other on
 * GO; overlay (hot cue) sequences run independently and never touch main ones.
 */
export type SequenceScope = "main" | "overlay";

export interface RunningSequence {
  rootId: string;
  currentStep: number;
  stepCount: number;
  stepCueIds: string[];
  /** Wall-clock ms when the current step started (for wait progress). */
  stepStartedAtMs: number;
  scope: SequenceScope;
}

interface TransportState {
  isPlaying: boolean;
  activeCueId: string | null;
  activeCueIds: string[];
  /** Wall-clock ms when each cue was triggered (for A/V sync). */
  cueStartedAtMs: Record<string, number>;
  /** Running sequences keyed by root cue id (main list + any overlay/hot ones). */
  runningSequences: Record<string, RunningSequence>;
  masterVolume: number;
  go: (cueId: string) => void;
  goMany: (cueIds: string[]) => void;
  setRunningSequence: (rootId: string, seq: RunningSequence) => void;
  clearRunningSequence: (rootId: string) => void;
  clearAllRunningSequences: () => void;
  stop: () => void;
  stopCue: (cueId: string) => void;
  stopMany: (cueIds: string[]) => void;
  panic: () => void;
  setMasterVolume: (v: number) => void;
  /** Jump an active audio/video cue to a position in the source file (seconds). */
  seekCue: (cueId: string, positionSec: number) => void;
}

function findActiveCue(cueId: string): Cue | undefined {
  const list = getActiveCueListFromState(useProjectStore.getState());
  return list?.cues.find((c) => c.id === cueId);
}

/** Running sequence whose root is `cueId`, or that has `cueId` in its current step. */
export function findRunningSequenceForCue(
  runningSequences: Record<string, RunningSequence>,
  cueId: string,
): RunningSequence | undefined {
  for (const seq of Object.values(runningSequences)) {
    if (seq.rootId === cueId || seq.stepCueIds.includes(cueId)) return seq;
  }
  return undefined;
}

/** True when `cueId` is part of any running sequence's current step. */
export function isCueInRunningStep(
  runningSequences: Record<string, RunningSequence>,
  cueId: string,
): boolean {
  return Object.values(runningSequences).some((seq) => seq.stepCueIds.includes(cueId));
}

/** True when any sequence is currently running. */
export function hasRunningSequences(runningSequences: Record<string, RunningSequence>): boolean {
  return Object.keys(runningSequences).length > 0;
}

function mergeActiveIds(existing: string[], incoming: string[]): string[] {
  const next = [...existing];
  for (const id of incoming) {
    if (!next.includes(id)) next.push(id);
  }
  return next;
}

export const useTransportStore = create<TransportState>()(
  devtools(
    (set) => ({
      isPlaying: false,
      activeCueId: null,
      activeCueIds: [],
      cueStartedAtMs: {},
      runningSequences: {},
      masterVolume: 1,

      go: (cueId) => {
        useFadeStore.getState().clearFade(cueId);
        useFadeStore.getState().clearRuntimeLevels([cueId]);
        useFadeStore.getState().clearDmxFade(cueId);
        set((s) => {
          const now = Date.now();
          const activeCueIds = mergeActiveIds(
            s.activeCueIds.filter((id) => id !== cueId),
            [cueId],
          );
          return {
            isPlaying: true,
            activeCueId: cueId,
            activeCueIds,
            cueStartedAtMs: { ...s.cueStartedAtMs, [cueId]: now },
          };
        });
      },

      goMany: (cueIds) => {
        useFadeStore.getState().clearFades(cueIds);
        useFadeStore.getState().clearRuntimeLevels(cueIds);
        for (const id of cueIds) {
          useFadeStore.getState().clearDmxFade(id);
        }
        set((s) => {
          if (cueIds.length === 0) return s;
          const now = Date.now();
          const cueStartedAtMs = { ...s.cueStartedAtMs };
          for (const id of cueIds) {
            cueStartedAtMs[id] = now;
          }
          const activeCueIds = mergeActiveIds(s.activeCueIds, cueIds);
          return {
            isPlaying: true,
            activeCueId: cueIds[cueIds.length - 1] ?? s.activeCueId,
            activeCueIds,
            cueStartedAtMs,
          };
        });
      },

      setRunningSequence: (rootId, seq) =>
        set((s) => ({ runningSequences: { ...s.runningSequences, [rootId]: seq } })),

      clearRunningSequence: (rootId) =>
        set((s) => {
          if (!(rootId in s.runningSequences)) return s;
          const runningSequences = { ...s.runningSequences };
          delete runningSequences[rootId];
          return { runningSequences };
        }),

      clearAllRunningSequences: () => set({ runningSequences: {} }),

      stop: () => {
        clearSequenceTimers();
        for (const id of Object.keys(useFadeStore.getState().dmxFadesByFadeCueId)) {
          useFadeStore.getState().clearDmxFade(id);
        }
        set({
          isPlaying: false,
          activeCueId: null,
          activeCueIds: [],
          cueStartedAtMs: {},
          runningSequences: {},
        });
      },

      stopCue: (cueId) =>
        set((s) => {
          const activeCueIds = s.activeCueIds.filter((id) => id !== cueId);
          const cueStartedAtMs = { ...s.cueStartedAtMs };
          delete cueStartedAtMs[cueId];
          return {
            activeCueIds,
            cueStartedAtMs,
            activeCueId:
              s.activeCueId === cueId
                ? (activeCueIds[activeCueIds.length - 1] ?? null)
                : s.activeCueId,
            isPlaying: activeCueIds.length > 0 || hasRunningSequences(s.runningSequences),
          };
        }),

      stopMany: (cueIds) =>
        set((s) => {
          for (const id of cueIds) {
            useFadeStore.getState().clearDmxFade(id);
          }
          const remove = new Set(cueIds);
          const activeCueIds = s.activeCueIds.filter((id) => !remove.has(id));
          const cueStartedAtMs = { ...s.cueStartedAtMs };
          for (const id of cueIds) {
            delete cueStartedAtMs[id];
          }
          return {
            activeCueIds,
            cueStartedAtMs,
            activeCueId:
              s.activeCueId && remove.has(s.activeCueId)
                ? (activeCueIds[activeCueIds.length - 1] ?? null)
                : s.activeCueId,
            isPlaying: activeCueIds.length > 0 || hasRunningSequences(s.runningSequences),
          };
        }),

      panic: () => {
        clearSequenceTimers();
        useFadeStore.getState().clearAllFades();
        set({
          isPlaying: false,
          activeCueId: null,
          activeCueIds: [],
          cueStartedAtMs: {},
          runningSequences: {},
        });
      },

      setMasterVolume: (masterVolume) =>
        set({ masterVolume: Math.max(0, Math.min(1, masterVolume)) }),

      seekCue: (cueId, positionSec) =>
        set((s) => {
          if (!s.activeCueIds.includes(cueId)) return s;

          const cue = findActiveCue(cueId);
          if (!cue || (cue.type !== "audio" && cue.type !== "video")) return s;

          const sourceDurationSec = cue.assetPath ? getMediaDurationSec(cue.assetPath) : undefined;
          const goAtMs = goAtMsForSeekPosition(cue, positionSec, sourceDurationSec);

          return {
            cueStartedAtMs: { ...s.cueStartedAtMs, [cueId]: goAtMs },
          };
        }),
    }),
    { name: "TransportStore" },
  ),
);
