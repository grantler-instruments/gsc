import type { Cue } from "../types/cue";
import { estimateStepDurationMs } from "./cue-duration";
import { expandSequenceSteps, isFadeCue } from "./cues";
import { fireStepCues, playbackCueIdsInStep } from "./fire-step-cues";
import { clearSequenceTimers, scheduleSequenceStep } from "./sequence-timers";
import { useTransportStore } from "../stores/transport";

export function cancelAllSequences(): void {
  clearSequenceTimers();
  useTransportStore.getState().setRunningSequence(null);
}

/** Advance the running sequence after the current step finishes. */
export function advanceRunningSequence(cues: Cue[]): void {
  const transport = useTransportStore.getState();
  const running = transport.runningSequence;
  if (!running) return;

  const rootCue = cues.find((c) => c.id === running.rootId);
  if (!rootCue) {
    cancelAllSequences();
    return;
  }

  const steps = expandSequenceSteps(running.rootId, cues);
  const nextIndex = running.currentStep + 1;

  clearSequenceTimers();

  if (nextIndex >= steps.length) {
    cancelAllSequences();
    return;
  }

  runSequenceStep(rootCue, cues, steps, nextIndex);
}

function runSequenceStep(
  rootCue: Cue,
  cues: Cue[],
  steps: string[][],
  index: number,
): void {
  const transport = useTransportStore.getState();
  const stepCueIds = steps[index];

  if (stepCueIds.length === 0) {
    if (index + 1 >= steps.length) {
      cancelAllSequences();
      return;
    }
    runSequenceStep(rootCue, cues, steps, index + 1);
    return;
  }

  transport.setRunningSequence({
    rootId: rootCue.id,
    currentStep: index,
    stepCount: steps.length,
    stepCueIds,
    stepStartedAtMs: performance.now(),
  });

  fireStepCues(
    stepCueIds,
    cues,
    {
      goMany: (ids) => transport.goMany(ids),
      go: (id) => transport.go(id),
      stopMany: (ids) => transport.stopMany(ids),
    },
    { runSequence: (cue, list) => runSequence(cue, list) },
  );

  const durationMs = estimateStepDurationMs(stepCueIds, cues);
  const playbackIds = playbackCueIdsInStep(stepCueIds, cues);

  scheduleSequenceStep(() => {
    if (playbackIds.length > 0) {
      transport.stopMany(playbackIds);
    }
    if (index + 1 >= steps.length) {
      cancelAllSequences();
      return;
    }
    runSequenceStep(rootCue, cues, steps, index + 1);
  }, durationMs);
}

export function runSequence(
  rootCue: Cue,
  cues: Cue[],
): { started: boolean; stepCount: number } {
  const steps = expandSequenceSteps(rootCue.id, cues);
  if (steps.length === 0) {
    return { started: false, stepCount: 0 };
  }

  cancelAllSequences();
  runSequenceStep(rootCue, cues, steps, 0);
  return { started: true, stepCount: steps.length };
}

/** When a fade cue finishes, advance if the sequence is waiting on it. */
export function notifyFadeCueComplete(fadeCueId: string, cues: Cue[]): void {
  const running = useTransportStore.getState().runningSequence;
  if (!running) return;
  if (!running.stepCueIds.includes(fadeCueId)) return;

  const fadeCue = cues.find((c) => c.id === fadeCueId);
  if (!fadeCue || !isFadeCue(fadeCue)) return;

  // Only skip the timer when this step is fade-only (typical fade → stop chain).
  const stepIsFadeOnly =
    running.stepCueIds.length === 1 && running.stepCueIds[0] === fadeCueId;

  if (stepIsFadeOnly) {
    advanceRunningSequence(cues);
  }
}
