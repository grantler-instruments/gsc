import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { type SequenceScope, useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";
import { estimateStepDurationMs } from "./cue-duration";
import { expandSequenceSteps, isFadeCue, isParallelGroup, isSequenceGroup } from "./cues";
import { fireStepCues, playbackCueIdsInStep } from "./fire-step-cues";
import { isEngineManagedPlaybackCue } from "./playback-slice";
import {
  clearSequenceTimers,
  scheduleSequenceStep,
  scheduleSequenceStepWatchdog,
} from "./sequence-timers";
import { transportNowMs } from "./transport-clock";

/** Cancel a single running sequence (timers + transport entry). */
export function cancelSequence(rootId: string): void {
  clearSequenceTimers(rootId);
  useTransportStore.getState().clearRunningSequence(rootId);
}

export function cancelAllSequences(): void {
  clearSequenceTimers();
  useTransportStore.getState().clearAllRunningSequences();
}

function cancelSequencesByScope(scope: SequenceScope): void {
  const running = useTransportStore.getState().runningSequences;
  for (const seq of Object.values(running)) {
    if (seq.scope === scope) cancelSequence(seq.rootId);
  }
}

interface CompleteStepOptions {
  /** Stop any playback cues still active in the step (timer fallback). */
  forceStopPlayback?: boolean;
}

interface RunSequenceOptions {
  scope?: SequenceScope;
  parent?: {
    rootId: string;
    stepIndex: number;
  };
}

function resumeParentSequence(cues: Cue[], parent: { rootId: string; stepIndex: number }): void {
  const parentRoot = cues.find((c) => c.id === parent.rootId);
  if (!parentRoot) {
    cancelSequence(parent.rootId);
    return;
  }
  const parentSteps = expandSequenceSteps(parent.rootId, cues);
  const transport = useTransportStore.getState();
  const scope = transport.runningSequences[parent.rootId]?.scope ?? "main";
  clearSequenceTimers(parent.rootId);
  // Do not copy the child's `parent` link — it points at this sequence, not its grandparent.
  transport.setRunningSequence(parent.rootId, {
    rootId: parent.rootId,
    currentStep: parent.stepIndex,
    stepCount: parentSteps.length,
    stepCueIds: parentSteps[parent.stepIndex] ?? [],
    stepStartedAtMs: transportNowMs(),
    scope,
  });
  completeSequenceStep(parentRoot, cues, parentSteps, parent.stepIndex, scope);
}

function finishSequenceOrAdvance(
  rootCue: Cue,
  cues: Cue[],
  steps: string[][],
  stepIndex: number,
  scope: SequenceScope,
): void {
  const nextIndex = stepIndex + 1;
  if (nextIndex >= steps.length) {
    const parent = useTransportStore.getState().runningSequences[rootCue.id]?.parent;
    cancelSequence(rootCue.id);
    if (parent) {
      resumeParentSequence(cues, parent);
      return;
    }
    return;
  }

  runSequenceStep(rootCue, cues, steps, nextIndex, scope);
}

/** Advance or finish the sequence after the given step completes. Idempotent per step index. */
function completeSequenceStep(
  rootCue: Cue,
  cues: Cue[],
  steps: string[][],
  stepIndex: number,
  scope: SequenceScope,
  options: CompleteStepOptions = {},
): void {
  const transport = useTransportStore.getState();
  const running = transport.runningSequences[rootCue.id];
  if (!running || running.currentStep !== stepIndex) {
    return;
  }

  clearSequenceTimers(rootCue.id);

  if (options.forceStopPlayback) {
    const playbackIds = playbackCueIdsInStep(running.stepCueIds, cues);
    const stillActive = playbackIds.filter((id) => transport.activeCueIds.includes(id));
    if (stillActive.length > 0) {
      transport.stopMany(stillActive);
    }
  }

  const nextIndex = stepIndex + 1;
  if (nextIndex >= steps.length) {
    finishSequenceOrAdvance(rootCue, cues, steps, stepIndex, scope);
    return;
  }

  runSequenceStep(rootCue, cues, steps, nextIndex, scope, running.parent);
}

/** Advance a specific running sequence after its current step finishes. */
export function advanceRunningSequence(rootId: string, cues: Cue[]): void {
  const transport = useTransportStore.getState();
  const running = transport.runningSequences[rootId];
  if (!running) return;

  const rootCue = cues.find((c) => c.id === running.rootId);
  if (!rootCue) {
    cancelSequence(rootId);
    return;
  }

  const steps = expandSequenceSteps(running.rootId, cues);
  completeSequenceStep(rootCue, cues, steps, running.currentStep, running.scope);
}

function runSequenceStep(
  rootCue: Cue,
  cues: Cue[],
  steps: string[][],
  index: number,
  scope: SequenceScope,
  parent?: RunSequenceOptions["parent"],
): void {
  const transport = useTransportStore.getState();
  const stepCueIds = steps[index];

  if (stepCueIds.length === 0) {
    if (index + 1 >= steps.length) {
      finishSequenceOrAdvance(rootCue, cues, steps, index, scope);
      return;
    }
    runSequenceStep(rootCue, cues, steps, index + 1, scope, parent);
    return;
  }

  const stepStartedAtMs = transportNowMs();
  const runningBefore = transport.runningSequences[rootCue.id];
  const preservedParent =
    parent ?? (runningBefore?.rootId === rootCue.id ? runningBefore.parent : undefined);
  const stepRunning = {
    rootId: rootCue.id,
    currentStep: index,
    stepCount: steps.length,
    stepCueIds,
    stepStartedAtMs,
    scope,
    ...(preservedParent ? { parent: preservedParent } : {}),
  };

  // Set before firing so notifyStepPlaybackEnded is not dropped when a short clip
  // ends during the same turn as fireStepCues (common on CI).
  transport.setRunningSequence(rootCue.id, stepRunning);

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
        runSequence(cue, list, {
          scope,
          parent: { rootId: rootCue.id, stepIndex: index },
        }),
    },
  );

  const postFire = useTransportStore.getState().runningSequences;
  const childSeqId = stepCueIds.find((id) => postFire[id]?.rootId === id && id !== rootCue.id);
  if (childSeqId) {
    const childSeq = postFire[childSeqId];
    if (childSeq && !childSeq.parent) {
      transport.setRunningSequence(childSeqId, {
        ...childSeq,
        parent: { rootId: rootCue.id, stepIndex: index },
      });
    }
    // Child sequence schedules its own timers/watchdog in its runSequenceStep.
    return;
  }

  const playbackInStep = playbackCueIdsInStep(stepCueIds, cues);
  const delegatesToNestedRunner =
    playbackInStep.length === 0 &&
    stepCueIds.some((id) => {
      const cue = cues.find((c) => c.id === id);
      return cue !== undefined && (isSequenceGroup(cue) || isParallelGroup(cue));
    });
  // Container-only steps delegate timing to nested runners; wait/fade/stop still need timers.
  if (delegatesToNestedRunner) {
    return;
  }

  const nestedRunning = useTransportStore.getState().runningSequences[rootCue.id];
  if (
    !nestedRunning ||
    nestedRunning.currentStep !== index ||
    nestedRunning.stepCueIds !== stepCueIds
  ) {
    transport.setRunningSequence(rootCue.id, stepRunning);
  }

  const durationMs = estimateStepDurationMs(stepCueIds, cues);

  scheduleSequenceStep(
    rootCue.id,
    () => {
      completeSequenceStep(rootCue, cues, steps, index, scope, { forceStopPlayback: true });
    },
    durationMs,
  );

  scheduleSequenceStepWatchdog(rootCue.id, () => {
    tryAdvanceSequenceIfStepPlaybackInactive();
  });
}

export function runSequence(
  rootCue: Cue,
  cues: Cue[],
  options: RunSequenceOptions = {},
): { started: boolean; stepCount: number } {
  const scope = options.scope ?? "main";
  const steps = expandSequenceSteps(rootCue.id, cues);
  if (steps.length === 0) {
    return { started: false, stepCount: 0 };
  }

  if (options.parent) {
    clearSequenceTimers(rootCue.id);
  } else if (scope === "main") {
    cancelSequencesByScope("main");
  } else {
    cancelSequence(rootCue.id);
  }

  runSequenceStep(rootCue, cues, steps, 0, scope, options.parent);
  return { started: true, stepCount: steps.length };
}

function allProjectCues(): Cue[] {
  return useProjectStore.getState().cueLists.flatMap((list) => list.cues);
}

function cuesForRunningSequence(scope: SequenceScope): Cue[] {
  return scope === "overlay"
    ? allProjectCues()
    : (getActiveCueListFromState(useProjectStore.getState())?.cues ?? []);
}

/** Advance when all playback cues in the current step have stopped. */
export function notifyStepPlaybackEnded(stoppedCueIds: string[]): void {
  if (stoppedCueIds.length === 0) return;

  const transport = useTransportStore.getState();
  const running = transport.runningSequences;
  if (Object.keys(running).length === 0) return;

  for (const [rootId, seq] of Object.entries(running)) {
    const cues = cuesForRunningSequence(seq.scope);
    const playbackIds = playbackCueIdsInStep(seq.stepCueIds, cues);
    const stoppedPlayback = stoppedCueIds.filter((id) => playbackIds.includes(id));
    if (stoppedPlayback.length === 0) continue;

    const stillActive = playbackIds.filter((id) => transport.activeCueIds.includes(id));
    if (stillActive.length > 0) continue;

    const rootCue = cues.find((c) => c.id === seq.rootId);
    if (!rootCue) {
      cancelSequence(rootId);
      continue;
    }

    const steps = expandSequenceSteps(seq.rootId, cues);
    completeSequenceStep(rootCue, cues, steps, seq.currentStep, seq.scope);
  }
}

/**
 * Fallback when playback-end notifications are missed (headless CI / engine races).
 * Advances once every playback cue in the current step is inactive.
 */
export function tryAdvanceSequenceIfStepPlaybackInactive(): void {
  const transport = useTransportStore.getState();
  const running = transport.runningSequences;
  if (Object.keys(running).length === 0) return;

  for (const seq of Object.values(running)) {
    const cues = cuesForRunningSequence(seq.scope);
    const playbackIds = playbackCueIdsInStep(seq.stepCueIds, cues);
    if (playbackIds.length === 0) continue;

    const stillActive = playbackIds.filter((id) => transport.activeCueIds.includes(id));
    if (stillActive.length > 0) continue;

    notifyStepPlaybackEnded(playbackIds);
  }
}

/** When a fade cue finishes, advance if the sequence is waiting on it. */
export function notifyFadeCueComplete(fadeCueId: string, cues: Cue[]): void {
  const running = useTransportStore.getState().runningSequences;
  const owner = Object.values(running).find((seq) => seq.stepCueIds.includes(fadeCueId));
  if (!owner) return;

  const fadeCue = cues.find((c) => c.id === fadeCueId);
  if (!fadeCue || !isFadeCue(fadeCue)) return;

  // Only skip the timer when this step is fade-only (typical fade → stop chain).
  const stepIsFadeOnly = owner.stepCueIds.length === 1 && owner.stepCueIds[0] === fadeCueId;

  if (stepIsFadeOnly) {
    const rootCue = cues.find((c) => c.id === owner.rootId);
    if (!rootCue) {
      cancelSequence(owner.rootId);
      return;
    }
    const steps = expandSequenceSteps(owner.rootId, cues);
    completeSequenceStep(rootCue, cues, steps, owner.currentStep, owner.scope);
  }
}

/** Called when a property fade tied to a fade utility cue finishes. */
export function handleSequenceFadeCueCompleted(fadeCueId: string): void {
  // Search all lists: an overlay (hot) sequence's fade cue may live outside the active list.
  const running = useTransportStore.getState().runningSequences;
  const owner = Object.values(running).find((seq) => seq.stepCueIds.includes(fadeCueId));
  if (!owner) return;
  const cues = cuesForRunningSequence(owner.scope);
  notifyFadeCueComplete(fadeCueId, cues);
}

/** True when natural playback end is reported by the audio engine, not the progress tick. */
export function cueCompletesViaAudioEngine(cue: Cue): boolean {
  return isEngineManagedPlaybackCue(cue);
}
