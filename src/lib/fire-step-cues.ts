import type { Cue } from "../types/cue";
import {
  getChildCues,
  getStopTarget,
  isContainerCue,
  isFadeCue,
  isParallelGroup,
  isSequenceGroup,
  isStopCue,
  isUtilityCue,
  isWaitCue,
  resolveStopCueIds,
} from "./cues";
import { triggerFadeCue } from "./trigger-fade";
import { clearSequenceTimers } from "./sequence-timers";
import { useTransportStore } from "../stores/transport";

export interface StepTransportActions {
  goMany: (cueIds: string[]) => void;
  go: (cueId: string) => void;
  stopMany: (cueIds: string[]) => void;
}

export interface FireStepOptions {
  /** Nested sequences inside a step. */
  runSequence?: (cue: Cue, cues: Cue[]) => void;
}

function fireStopCue(cue: Cue, cues: Cue[], stopMany: (ids: string[]) => void): void {
  const target = getStopTarget(cue, cues);
  if (!target) return;
  if (isSequenceGroup(target)) {
    clearSequenceTimers();
    useTransportStore.getState().setRunningSequence(null);
  }
  stopMany(resolveStopCueIds(target, cues));
}

/** Fire each cue in a sequence/parallel step (fades, stops, playback). */
export function fireStepCues(
  stepCueIds: string[],
  cues: Cue[],
  actions: StepTransportActions,
  options: FireStepOptions = {},
): void {
  const playbackIds: string[] = [];

  for (const id of stepCueIds) {
    const cue = cues.find((c) => c.id === id);
    if (!cue) continue;

    if (isStopCue(cue)) {
      fireStopCue(cue, cues, actions.stopMany);
    } else if (isWaitCue(cue)) {
      /* no-op — sequence timer advances after wait duration */
    } else if (isFadeCue(cue)) {
      triggerFadeCue(cue, cues);
    } else if (isSequenceGroup(cue)) {
      options.runSequence?.(cue, cues);
    } else if (isParallelGroup(cue)) {
      playbackIds.push(...fireParallelGroup(cue, cues, actions, options));
    } else {
      playbackIds.push(id);
    }
  }

  if (playbackIds.length > 0) {
    actions.goMany(playbackIds);
  }
}

function fireParallelGroup(
  cue: Cue,
  cues: Cue[],
  actions: StepTransportActions,
  options: FireStepOptions,
): string[] {
  const leafIds: string[] = [];

  for (const child of getChildCues(cues, cue.id)) {
    if (isStopCue(child)) {
      fireStopCue(child, cues, actions.stopMany);
    } else if (isWaitCue(child)) {
      /* no-op */
    } else if (isFadeCue(child)) {
      triggerFadeCue(child, cues);
    } else if (isSequenceGroup(child)) {
      options.runSequence?.(child, cues);
    } else if (isParallelGroup(child)) {
      leafIds.push(...fireParallelGroup(child, cues, actions, options));
    } else {
      leafIds.push(child.id);
    }
  }

  return leafIds;
}

/** Playback cue ids in a step — utility/container cues are excluded. */
export function playbackCueIdsInStep(
  stepCueIds: string[],
  cues: Cue[],
): string[] {
  return stepCueIds.filter((id) => {
    const cue = cues.find((c) => c.id === id);
    return cue !== undefined && !isUtilityCue(cue) && !isContainerCue(cue);
  });
}
