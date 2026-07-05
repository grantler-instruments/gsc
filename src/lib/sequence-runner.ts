import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";
import { estimateStepDurationMs } from "./cue-duration";
import { expandSequenceSteps, isFadeCue } from "./cues";
import { fireStepCues, playbackCueIdsInStep } from "./fire-step-cues";
import { isEngineManagedPlaybackCue } from "./playback-slice";
import { clearSequenceTimers, scheduleSequenceStep } from "./sequence-timers";
import { transportNowMs } from "./transport-clock";

export function cancelAllSequences(): void {
  clearSequenceTimers();
  useTransportStore.getState().setRunningSequence(null);
}

interface CompleteStepOptions {
  /** Stop any playback cues still active in the step (timer fallback). */
  forceStopPlayback?: boolean;
}

interface RunSequenceOptions {
  parent?: {
    rootId: string;
    stepIndex: number;
  };
}

function resumeParentSequence(cues: Cue[], parent: { rootId: string; stepIndex: number }): void {
  const parentRoot = cues.find((c) => c.id === parent.rootId);
  if (!parentRoot) {
    cancelAllSequences();
    return;
  }
  const parentSteps = expandSequenceSteps(parent.rootId, cues);
  clearSequenceTimers();
  useTransportStore.getState().setRunningSequence(null);
  completeSequenceStep(parentRoot, cues, parentSteps, parent.stepIndex);
}

function finishSequenceOrAdvance(
  rootCue: Cue,
  cues: Cue[],
  steps: string[][],
  stepIndex: number,
): void {
  const nextIndex = stepIndex + 1;
  if (nextIndex >= steps.length) {
    const parent = useTransportStore.getState().runningSequence?.parent;
    if (parent) {
      resumeParentSequence(cues, parent);
      return;
    }
    cancelAllSequences();
    return;
  }

  runSequenceStep(rootCue, cues, steps, nextIndex);
}

/** Advance or finish the sequence after the given step completes. Idempotent per step index. */
function completeSequenceStep(
  rootCue: Cue,
  cues: Cue[],
  steps: string[][],
  stepIndex: number,
  options: CompleteStepOptions = {},
): void {
  const transport = useTransportStore.getState();
  const running = transport.runningSequence;
  if (!running || running.rootId !== rootCue.id || running.currentStep !== stepIndex) {
    return;
  }

  clearSequenceTimers();

  if (options.forceStopPlayback) {
    const playbackIds = playbackCueIdsInStep(running.stepCueIds, cues);
    const stillActive = playbackIds.filter((id) => transport.activeCueIds.includes(id));
    if (stillActive.length > 0) {
      transport.stopMany(stillActive);
    }
  }

  const nextIndex = stepIndex + 1;
  if (nextIndex >= steps.length) {
    finishSequenceOrAdvance(rootCue, cues, steps, stepIndex);
    return;
  }

  runSequenceStep(rootCue, cues, steps, nextIndex);
}

/** Advance the running sequence after the current step finishes. */
export function advanceRunningSequence(cues: Cue[]): void {
  const running = useTransportStore.getState().runningSequence;
  if (!running) return;

  const rootCue = cues.find((c) => c.id === running.rootId);
  if (!rootCue) {
    cancelAllSequences();
    return;
  }

  const steps = expandSequenceSteps(running.rootId, cues);
  completeSequenceStep(rootCue, cues, steps, running.currentStep);
}

function runSequenceStep(
  rootCue: Cue,
  cues: Cue[],
  steps: string[][],
  index: number,
  parent?: RunSequenceOptions["parent"],
): void {
  const transport = useTransportStore.getState();
  const stepCueIds = steps[index];

  if (stepCueIds.length === 0) {
    if (index + 1 >= steps.length) {
      finishSequenceOrAdvance(rootCue, cues, steps, index);
      return;
    }
    runSequenceStep(rootCue, cues, steps, index + 1, parent);
    return;
  }

  const stepStartedAtMs = transportNowMs();
  const runningBefore = useTransportStore.getState().runningSequence;
  const preservedParent =
    parent ?? (runningBefore?.rootId === rootCue.id ? runningBefore.parent : undefined);
  const stepRunning = {
    rootId: rootCue.id,
    currentStep: index,
    stepCount: steps.length,
    stepCueIds,
    stepStartedAtMs,
    ...(preservedParent ? { parent: preservedParent } : {}),
  };

  // Set before firing so notifyStepPlaybackEnded is not dropped when a short clip
  // ends during the same turn as fireStepCues (common on CI).
  transport.setRunningSequence(stepRunning);

  fireStepCues(
    stepCueIds,
    cues,
    {
      goMany: (ids) => transport.goMany(ids),
      go: (id) => transport.go(id),
      stopMany: (ids) => transport.stopMany(ids),
    },
    {
      runSequence: (cue, list) =>
        runSequence(cue, list, { parent: { rootId: rootCue.id, stepIndex: index } }),
    },
  );

  const nestedRunning = useTransportStore.getState().runningSequence;
  if (nestedRunning && nestedRunning.rootId !== rootCue.id) {
    if (!nestedRunning.parent) {
      transport.setRunningSequence({
        ...nestedRunning,
        parent: { rootId: rootCue.id, stepIndex: index },
      });
    }
    return;
  }

  if (
    nestedRunning?.rootId !== rootCue.id ||
    nestedRunning.currentStep !== index ||
    nestedRunning.stepCueIds !== stepCueIds
  ) {
    transport.setRunningSequence(stepRunning);
  }

  const durationMs = estimateStepDurationMs(stepCueIds, cues);

  scheduleSequenceStep(() => {
    completeSequenceStep(rootCue, cues, steps, index, { forceStopPlayback: true });
  }, durationMs);
}

export function runSequence(
  rootCue: Cue,
  cues: Cue[],
  options: RunSequenceOptions = {},
): { started: boolean; stepCount: number } {
  const steps = expandSequenceSteps(rootCue.id, cues);
  if (steps.length === 0) {
    return { started: false, stepCount: 0 };
  }

  if (options.parent) {
    clearSequenceTimers();
  } else {
    cancelAllSequences();
  }
  runSequenceStep(rootCue, cues, steps, 0, options.parent);
  return { started: true, stepCount: steps.length };
}

/** Called when playback cues in the current step have stopped (audio engine or progress fallback). */
export function notifyStepPlaybackEnded(stoppedCueIds: string[]): void {
  if (stoppedCueIds.length === 0) return;

  const transport = useTransportStore.getState();
  const running = transport.runningSequence;
  if (!running) return;

  const cues = getActiveCueListFromState(useProjectStore.getState())?.cues ?? [];
  const playbackIds = playbackCueIdsInStep(running.stepCueIds, cues);
  const stoppedPlayback = stoppedCueIds.filter((id) => playbackIds.includes(id));
  if (stoppedPlayback.length === 0) return;

  const stillActive = playbackIds.filter((id) => transport.activeCueIds.includes(id));
  if (stillActive.length > 0) return;

  const rootCue = cues.find((c) => c.id === running.rootId);
  if (!rootCue) {
    cancelAllSequences();
    return;
  }

  const steps = expandSequenceSteps(running.rootId, cues);
  completeSequenceStep(rootCue, cues, steps, running.currentStep);
}

/** When a fade cue finishes, advance if the sequence is waiting on it. */
export function notifyFadeCueComplete(fadeCueId: string, cues: Cue[]): void {
  const running = useTransportStore.getState().runningSequence;
  if (!running) return;
  if (!running.stepCueIds.includes(fadeCueId)) return;

  const fadeCue = cues.find((c) => c.id === fadeCueId);
  if (!fadeCue || !isFadeCue(fadeCue)) return;

  // Only skip the timer when this step is fade-only (typical fade → stop chain).
  const stepIsFadeOnly = running.stepCueIds.length === 1 && running.stepCueIds[0] === fadeCueId;

  if (stepIsFadeOnly) {
    const rootCue = cues.find((c) => c.id === running.rootId);
    if (!rootCue) {
      cancelAllSequences();
      return;
    }
    const steps = expandSequenceSteps(running.rootId, cues);
    completeSequenceStep(rootCue, cues, steps, running.currentStep);
  }
}

/** Called when a property fade tied to a fade utility cue finishes. */
export function handleSequenceFadeCueCompleted(fadeCueId: string): void {
  const cues = getActiveCueListFromState(useProjectStore.getState())?.cues ?? [];
  notifyFadeCueComplete(fadeCueId, cues);
}

/** True when natural playback end is reported by the audio engine, not the progress tick. */
export function cueCompletesViaAudioEngine(cue: Cue): boolean {
  return isEngineManagedPlaybackCue(cue);
}
