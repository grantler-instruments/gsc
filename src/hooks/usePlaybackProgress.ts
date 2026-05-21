import { useEffect, useRef } from "react";
import type { Cue } from "../types/cue";
import {
  ensureMediaDurationSec,
  getMediaDurationSec,
  prefetchMediaDurations,
} from "../lib/media-duration";
import { isWaitCue } from "../lib/wait";
import {
  computePlaybackProgressWithBounds,
  createPlaybackBounds,
  cueNeedsKnownDuration,
  cueShowsPlaybackProgress,
  isFinitePlaybackComplete,
  type PlaybackBounds,
} from "../lib/playback-slice";
import type { CuePlaybackProgress } from "../stores/playback";
import { usePlaybackStore } from "../stores/playback";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";

interface PlaybackSession {
  /** Wall-clock when the cue entered activeCueIds — not when bounds were resolved. */
  goAtMs: number;
  bounds: PlaybackBounds;
}

export function usePlaybackProgress(): void {
  const sessionsRef = useRef(new Map<string, PlaybackSession>());
  const goAtByCueIdRef = useRef(new Map<string, number>());
  const probedPathsRef = useRef(new Set<string>());

  const tryStartSession = (cueId: string, cue: Cue, activeCueIds: string[]) => {
    if (sessionsRef.current.has(cueId)) return;

    const sourceDurationSec = cue.assetPath
      ? getMediaDurationSec(cue.assetPath)
      : undefined;

    if (cueNeedsKnownDuration(cue) && sourceDurationSec === undefined) {
      if (cue.assetPath && !probedPathsRef.current.has(cue.assetPath)) {
        probedPathsRef.current.add(cue.assetPath);
        prefetchMediaDurations([cue.assetPath]);
      }
      void ensureMediaDurationSec(cue.assetPath!).then(() => {
        const stillActive =
          useTransportStore.getState().activeCueIds.includes(cueId);
        if (stillActive) {
          tryStartSession(cueId, cue, activeCueIds);
        }
      });
      return;
    }

    sessionsRef.current.set(cueId, {
      goAtMs: goAtByCueIdRef.current.get(cueId) ?? performance.now(),
      bounds: createPlaybackBounds(cue, sourceDurationSec),
    });
  };

  const syncSessions = (activeCueIds: string[]) => {
    const now = performance.now();
    const { cueLists, activeCueListId } = useProjectStore.getState();
    const list =
      cueLists.find((l) => l.id === activeCueListId) ?? cueLists[0];
    const cueById = new Map(list?.cues.map((c) => [c.id, c]) ?? []);

    for (const id of activeCueIds) {
      if (!goAtByCueIdRef.current.has(id)) {
        goAtByCueIdRef.current.set(id, now);
      }
      const cue = cueById.get(id);
      if (cue && cueShowsPlaybackProgress(cue)) {
        tryStartSession(id, cue, activeCueIds);
      }
    }

    for (const id of [...sessionsRef.current.keys()]) {
      if (!activeCueIds.includes(id)) {
        sessionsRef.current.delete(id);
      }
    }

    for (const id of [...goAtByCueIdRef.current.keys()]) {
      if (!activeCueIds.includes(id)) {
        goAtByCueIdRef.current.delete(id);
      }
    }
  };

  useEffect(() => {
    syncSessions(useTransportStore.getState().activeCueIds);

    const unsub = useTransportStore.subscribe((state) => {
      syncSessions(state.activeCueIds);
      if (state.activeCueIds.length === 0) {
        sessionsRef.current.clear();
        goAtByCueIdRef.current.clear();
        usePlaybackStore.getState().clear();
      }
    });

    return () => {
      unsub();
      sessionsRef.current.clear();
      goAtByCueIdRef.current.clear();
      usePlaybackStore.getState().clear();
    };
  }, []);

  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      const { activeCueIds } = useTransportStore.getState();
      const { cueLists, activeCueListId } = useProjectStore.getState();
      const list =
        cueLists.find((l) => l.id === activeCueListId) ?? cueLists[0];
      const cueById = new Map(list?.cues.map((c) => [c.id, c]) ?? []);
      const now = performance.now();
      const entries: CuePlaybackProgress[] = [];
      const completedCueIds: string[] = [];

      const { runningSequence } = useTransportStore.getState();
      if (runningSequence) {
        const stepElapsedSec =
          (now - runningSequence.stepStartedAtMs) / 1000;
        for (const cueId of runningSequence.stepCueIds) {
          const cue = cueById.get(cueId);
          if (!cue || !isWaitCue(cue)) continue;
          const bounds = createPlaybackBounds(cue);
          const snapshot = computePlaybackProgressWithBounds(
            bounds,
            stepElapsedSec,
          );
          entries.push({
            cueId,
            elapsedSec: stepElapsedSec,
            sliceSec: bounds.sliceSec,
            ...snapshot,
          });
        }
      }

      for (const cueId of activeCueIds) {
        const session = sessionsRef.current.get(cueId);
        if (session) {
          const elapsedSec = (now - session.goAtMs) / 1000;
          const snapshot = computePlaybackProgressWithBounds(
            session.bounds,
            elapsedSec,
          );

          entries.push({
            cueId,
            elapsedSec,
            sliceSec: session.bounds.sliceSec,
            ...snapshot,
          });

          if (isFinitePlaybackComplete(session.bounds, elapsedSec)) {
            completedCueIds.push(cueId);
          }
          continue;
        }

        const cue = cueById.get(cueId);
        if (!cue || !cueShowsPlaybackProgress(cue)) continue;

        const sourceDurationSec = cue.assetPath
          ? getMediaDurationSec(cue.assetPath)
          : undefined;
        if (cueNeedsKnownDuration(cue) && sourceDurationSec === undefined) {
          continue;
        }

        const bounds = createPlaybackBounds(cue, sourceDurationSec);
        const goAtMs = goAtByCueIdRef.current.get(cueId) ?? now;
        const elapsedSec = (now - goAtMs) / 1000;
        const snapshot = computePlaybackProgressWithBounds(bounds, elapsedSec);

        entries.push({
          cueId,
          elapsedSec,
          sliceSec: bounds.sliceSec,
          ...snapshot,
        });

        if (isFinitePlaybackComplete(bounds, elapsedSec)) {
          completedCueIds.push(cueId);
        }
      }

      if (entries.length > 0) {
        usePlaybackStore.getState().setProgress(entries);
      } else if (activeCueIds.length === 0) {
        usePlaybackStore.getState().clear();
      }

      if (completedCueIds.length > 0) {
        useTransportStore.getState().stopMany(completedCueIds);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);
}
