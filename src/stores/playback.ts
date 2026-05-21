import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { PlaybackProgressSnapshot } from "../lib/playback-slice";

export interface CuePlaybackProgress extends PlaybackProgressSnapshot {
  cueId: string;
  elapsedSec: number;
  sliceSec: number;
}

interface PlaybackState {
  byCueId: Record<string, CuePlaybackProgress>;
  setProgress: (entries: CuePlaybackProgress[]) => void;
  clear: () => void;
}

export const usePlaybackStore = create<PlaybackState>()(
  devtools(
    (set) => ({
      byCueId: {},

      setProgress: (entries) =>
        set({
          byCueId: Object.fromEntries(entries.map((e) => [e.cueId, e])),
        }),

      clear: () => set({ byCueId: {} }),
    }),
    { name: "PlaybackStore" },
  ),
);
