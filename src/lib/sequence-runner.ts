import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { type SequenceScope, useTransportStore } from "../stores/transport";
import type { Cue } from "../types/cue";
import { estimateStepDurationMs } from "./cue-duration";
import { expandSequenceSteps, isFadeCue } from "./cues";
import { fireStepCues, playbackCueIdsInStep } from "./fire-step-cues";
import { clearSequenceTimers, scheduleSequenceStep } from "./sequence-timers";

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
  const nextIndex = running.currentStep + 1;

  clearSequenceTimers(rootId);

  if (nextIndex >= steps.length) {
    cancelSequence(rootId);
    return;
  }

  runSequenceStep(rootCue, cues, steps, nextIndex, running.scope);
}

function runSequenceStep(
  rootCue: Cue,
  cues: Cue[],
  steps: string[][],
  index: number,
  scope: SequenceScope,
): void {
  const transport = useTransportStore.getState();
  const stepCueIds = steps[index];

  if (stepCueIds.length === 0) {
    if (index + 1 >= steps.length) {
      cancelSequence(rootCue.id);
      return;
    }
    runSequenceStep(rootCue, cues, steps, index + 1, scope);
    return;
  }

  transport.setRunningSequence(rootCue.id, {
    rootId: rootCue.id,
    currentStep: index,
    stepCount: steps.length,
    stepCueIds,
    stepStartedAtMs: performance.now(),
    scope,
  });

  fireStepCues(
    stepCueIds,
    cues,
    {
      goMany: (ids) => transport.goMany(ids),
      go: (id) => transport.go(id),
      stopMany: (ids) => transport.stopMany(ids),
    },
    { runSequence: (cue, list) => runSequence(cue, list, { scope }) },
  );

  const durationMs = estimateStepDurationMs(stepCueIds, cues);
  const playbackIds = playbackCueIdsInStep(stepCueIds, cues);

  scheduleSequenceStep(
    rootCue.id,
    () => {
      if (playbackIds.length > 0) {
        transport.stopMany(playbackIds);
      }
      if (index + 1 >= steps.length) {
        cancelSequence(rootCue.id);
        return;
      }
      runSequenceStep(rootCue, cues, steps, index + 1, scope);
    },
    durationMs,
  );
}

export function runSequence(
  rootCue: Cue,
  cues: Cue[],
  options: { scope?: SequenceScope } = {},
): { started: boolean; stepCount: number } {
  const scope = options.scope ?? "main";
  const steps = expandSequenceSteps(rootCue.id, cues);
  if (steps.length === 0) {
    return { started: false, stepCount: 0 };
  }

  // Main GO replaces any other main-list sequence; hot/overlay sequences run
  // concurrently and only restart their own root.
  if (scope === "main") {
    cancelSequencesByScope("main");
  } else {
    cancelSequence(rootCue.id);
  }

  runSequenceStep(rootCue, cues, steps, 0, scope);
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

    clearSequenceTimers(rootId);
    advanceRunningSequence(rootId, cues);
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
    advanceRunningSequence(owner.rootId, cues);
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
