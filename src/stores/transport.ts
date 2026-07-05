import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { clamp01 } from "../lib/clamp";
import { getMediaDurationSec } from "../lib/media-duration";
import { goAtMsForSeekPosition } from "../lib/playback-seek";
import { clearSequenceTimers } from "../lib/sequence-timers";
import { transportNowMs } from "../lib/transport-clock";
import type { Cue } from "../types/cue";
import { useFadeStore } from "./fade";
import { getActiveCueListFromState, useProjectStore } from "./project";

export interface RunningSequence {
  rootId: string;
  currentStep: number;
  stepCount: number;
  stepCueIds: string[];
  /** Wall-clock ms when the current step started (for wait progress). */
  stepStartedAtMs: number;
  /** Set when a child sequence temporarily owns `runningSequence`. */
  parent?: {
    rootId: string;
    stepIndex: number;
  };
}

interface TransportState {
  isPlaying: boolean;
  activeCueId: string | null;
  activeCueIds: string[];
  /** Wall-clock ms when each cue was triggered (for A/V sync). */
  cueStartedAtMs: Record<string, number>;
  runningSequence: RunningSequence | null;
  masterVolume: number;
  go: (cueId: string) => void;
  goMany: (cueIds: string[]) => void;
  setRunningSequence: (seq: RunningSequence | null) => void;
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
      runningSequence: null,
      masterVolume: 1,

      go: (cueId) => {
        useFadeStore.getState().clearFade(cueId);
        useFadeStore.getState().clearRuntimeLevels([cueId]);
        useFadeStore.getState().clearDmxFade(cueId);
        set((s) => {
          const now = transportNowMs();
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
          const now = transportNowMs();
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

      setRunningSequence: (runningSequence) => set({ runningSequence }),

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
          runningSequence: null,
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
            isPlaying: activeCueIds.length > 0 || s.runningSequence !== null,
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
            isPlaying: activeCueIds.length > 0 || s.runningSequence !== null,
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
          runningSequence: null,
        });
      },

      setMasterVolume: (masterVolume) => set({ masterVolume: clamp01(masterVolume) }),

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
