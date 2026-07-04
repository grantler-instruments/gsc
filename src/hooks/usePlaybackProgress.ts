import { useEffect, useRef } from "react";
import {
  ensureMediaDurationSec,
  getMediaDurationSec,
  prefetchMediaDurations,
} from "../lib/media-duration";
import {
  computePlaybackProgressWithBounds,
  createPlaybackBounds,
  cueNeedsKnownDuration,
  cueShowsPlaybackProgress,
  isFinitePlaybackComplete,
  type PlaybackBounds,
} from "../lib/playback-slice";
import { notifyStepPlaybackEnded } from "../lib/sequence-runner";
import { isWaitCue } from "../lib/wait";
import type { CuePlaybackProgress } from "../stores/playback";
import { usePlaybackStore } from "../stores/playback";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { type RunningSequence, useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";

interface PlaybackSession {
  /** Wall-clock when the cue entered activeCueIds — not when bounds were resolved. */
  goAtMs: number;
  bounds: PlaybackBounds;
}

function runningSequenceHasWaitProgress(runningSequence: RunningSequence | null): boolean {
  if (!runningSequence) return false;
  const list = getActiveCueListFromState(useProjectStore.getState());
  const cueById = new Map(list?.cues.map((c) => [c.id, c]) ?? []);
  return runningSequence.stepCueIds.some((id) => {
    const cue = cueById.get(id);
    return cue !== undefined && isWaitCue(cue);
  });
}

function needsProgressUpdates(
  activeCueIds: string[],
  runningSequence: RunningSequence | null,
): boolean {
  return activeCueIds.length > 0 || runningSequenceHasWaitProgress(runningSequence);
}

export function usePlaybackProgress(): void {
  const sessionsRef = useRef(new Map<string, PlaybackSession>());
  const goAtByCueIdRef = useRef(new Map<string, number>());
  const probedPathsRef = useRef(new Set<string>());
  const ensureTickLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let rafId = 0;
    let ticking = false;

    const stopTickLoop = () => {
      ticking = false;
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const clearIdleState = () => {
      sessionsRef.current.clear();
      goAtByCueIdRef.current.clear();
      usePlaybackStore.getState().clear();
    };

    const tryStartSession = (cueId: string, cue: Cue) => {
      if (sessionsRef.current.has(cueId)) return;

      const sourceDurationSec = cue.assetPath ? getMediaDurationSec(cue.assetPath) : undefined;
      const assetPath = cue.assetPath;

      if (cueNeedsKnownDuration(cue) && sourceDurationSec === undefined) {
        if (assetPath && !probedPathsRef.current.has(assetPath)) {
          probedPathsRef.current.add(assetPath);
          prefetchMediaDurations([assetPath]);
        }
        if (!assetPath) return;
        void ensureMediaDurationSec(assetPath).then(() => {
          const { activeCueIds: currentActive } = useTransportStore.getState();
          if (currentActive.includes(cueId)) {
            tryStartSession(cueId, cue);
            ensureTickLoopRef.current?.();
          }
        });
        return;
      }

      sessionsRef.current.set(cueId, {
        goAtMs: goAtByCueIdRef.current.get(cueId) ?? Date.now(),
        bounds: createPlaybackBounds(cue, sourceDurationSec),
      });
    };

    const syncSessions = (activeCueIds: string[]) => {
      const now = Date.now();
      const { cueStartedAtMs } = useTransportStore.getState();
      const list = getActiveCueListFromState(useProjectStore.getState());
      const cueById = new Map(list?.cues.map((c) => [c.id, c]) ?? []);

      for (const id of activeCueIds) {
        const transportGoAt = cueStartedAtMs[id];
        if (transportGoAt !== undefined) {
          goAtByCueIdRef.current.set(id, transportGoAt);
        } else if (!goAtByCueIdRef.current.has(id)) {
          goAtByCueIdRef.current.set(id, now);
        }

        const session = sessionsRef.current.get(id);
        const resolvedGoAt = goAtByCueIdRef.current.get(id) ?? now;
        if (session && session.goAtMs !== resolvedGoAt) {
          session.goAtMs = resolvedGoAt;
        }

        const cue = cueById.get(id);
        if (cue && cueShowsPlaybackProgress(cue)) {
          tryStartSession(id, cue);
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

    const tick = () => {
      if (!ticking) return;

      const { activeCueIds, runningSequence } = useTransportStore.getState();
      const list = getActiveCueListFromState(useProjectStore.getState());
      const cueById = new Map(list?.cues.map((c) => [c.id, c]) ?? []);
      const nowWall = Date.now();
      const nowPerf = performance.now();
      const entries: CuePlaybackProgress[] = [];
      const completedCueIds: string[] = [];

      if (runningSequence) {
        const stepElapsedSec = (nowPerf - runningSequence.stepStartedAtMs) / 1000;
        for (const cueId of runningSequence.stepCueIds) {
          const cue = cueById.get(cueId);
          if (!cue || !isWaitCue(cue)) continue;
          const bounds = createPlaybackBounds(cue);
          const snapshot = computePlaybackProgressWithBounds(bounds, stepElapsedSec);
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
          const elapsedSec = (nowWall - session.goAtMs) / 1000;
          const snapshot = computePlaybackProgressWithBounds(session.bounds, elapsedSec);

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

        const sourceDurationSec = cue.assetPath ? getMediaDurationSec(cue.assetPath) : undefined;
        if (cueNeedsKnownDuration(cue) && sourceDurationSec === undefined) {
          continue;
        }

        const bounds = createPlaybackBounds(cue, sourceDurationSec);
        const goAtMs = goAtByCueIdRef.current.get(cueId) ?? nowWall;
        const elapsedSec = (nowWall - goAtMs) / 1000;
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
      } else if (!needsProgressUpdates(activeCueIds, runningSequence)) {
        usePlaybackStore.getState().clear();
      }

      if (completedCueIds.length > 0) {
        useTransportStore.getState().stopMany(completedCueIds);
        notifyStepPlaybackEnded(completedCueIds);
      }

      const transport = useTransportStore.getState();
      if (needsProgressUpdates(transport.activeCueIds, transport.runningSequence)) {
        rafId = requestAnimationFrame(tick);
      } else {
        stopTickLoop();
        clearIdleState();
      }
    };

    const ensureTickLoop = () => {
      const { activeCueIds, runningSequence } = useTransportStore.getState();
      syncSessions(activeCueIds);

      if (needsProgressUpdates(activeCueIds, runningSequence)) {
        if (!ticking) {
          ticking = true;
          rafId = requestAnimationFrame(tick);
        }
      } else {
        stopTickLoop();
        clearIdleState();
      }
    };

    ensureTickLoopRef.current = ensureTickLoop;

    ensureTickLoop();

    const unsub = useTransportStore.subscribe((state, prev) => {
      if (
        state.activeCueIds === prev.activeCueIds &&
        state.runningSequence === prev.runningSequence &&
        state.cueStartedAtMs === prev.cueStartedAtMs
      ) {
        return;
      }
      ensureTickLoop();
    });

    return () => {
      ensureTickLoopRef.current = null;
      unsub();
      stopTickLoop();
      clearIdleState();
    };
  }, []);
}
