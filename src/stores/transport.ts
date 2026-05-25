import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { clearSequenceTimers } from "../lib/sequence-timers";
import { useFadeStore } from "./fade";

export interface RunningSequence {
  rootId: string;
  currentStep: number;
  stepCount: number;
  stepCueIds: string[];
  /** Wall-clock ms when the current step started (for wait progress). */
  stepStartedAtMs: number;
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

      setRunningSequence: (runningSequence) => set({ runningSequence }),

      stop: () => {
        clearSequenceTimers();
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

      setMasterVolume: (masterVolume) =>
        set({ masterVolume: Math.max(0, Math.min(1, masterVolume)) }),
    }),
    { name: "TransportStore" },
  ),
);
