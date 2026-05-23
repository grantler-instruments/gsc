import {
  expandSequenceSteps,
  isParallelGroup,
  isSequenceGroup,
  resolveParallelGoIds,
} from "./cues";
import { isFadeCue } from "./fade";
import { getWaitDurationSec, isWaitCue } from "./wait";
import { getLoopPlayCount, INFINITE_LOOP_ESTIMATE_SEC } from "./loop";
import { getMediaDurationSec } from "./media-duration";
import { getPlaybackSliceSec } from "./playback-slice";
import type { Cue } from "../types/cue";

const DEFAULT_MEDIA_SEC = 5;
const DEFAULT_MIDI_SEC = 0.15;
const MIN_STEP_SEC = 0.1;

export function estimateCueDurationMs(cue: Cue, cues: Cue[]): number {
  if (isParallelGroup(cue)) {
    const ids = resolveParallelGoIds(cue, cues);
    if (ids.length === 0) return 0;
    return estimateStepDurationMs(ids, cues);
  }
  if (isSequenceGroup(cue)) {
    const steps = expandSequenceSteps(cue.id, cues);
    return steps.reduce(
      (sum, step) => sum + estimateStepDurationMs(step, cues),
      0,
    );
  }
  return leafDurationMs(cue);
}

export function estimateStepDurationMs(
  stepCueIds: string[],
  cues: Cue[],
): number {
  if (stepCueIds.length === 0) return 0;
  return Math.max(
    MIN_STEP_SEC * 1000,
    ...stepCueIds.map((id) => {
      const cue = cues.find((c) => c.id === id);
      return cue ? estimateCueDurationMs(cue, cues) : DEFAULT_MEDIA_SEC * 1000;
    }),
  );
}

function leafDurationMs(cue: Cue): number {
  if (isWaitCue(cue)) {
    return Math.max(MIN_STEP_SEC * 1000, getWaitDurationSec(cue) * 1000);
  }

  if (isFadeCue(cue)) {
    const sec = cue.fadeDuration ?? 2;
    return Math.max(MIN_STEP_SEC * 1000, sec * 1000);
  }

  const fadeIn = (cue.fadeIn ?? 0) * 1000;
  const fadeOut = (cue.fadeOut ?? 0) * 1000;

  if (cue.type === "midi" || cue.type === "osc" || cue.type === "dmx") {
    return Math.max(MIN_STEP_SEC * 1000, DEFAULT_MIDI_SEC * 1000);
  }

  if (cue.type === "image") {
    if (cue.outTime === undefined) {
      return INFINITE_LOOP_ESTIMATE_SEC * 1000;
    }
    return Math.max(MIN_STEP_SEC * 1000, cue.outTime * 1000);
  }

  const sourceDur = cue.assetPath
    ? getMediaDurationSec(cue.assetPath)
    : undefined;
  const slice = getPlaybackSliceSec(cue, sourceDur);
  const sliceMs = slice * 1000 + fadeIn + fadeOut;
  const plays = getLoopPlayCount(cue);
  if (plays === "inf") {
    return INFINITE_LOOP_ESTIMATE_SEC * 1000;
  }
  return sliceMs * plays;
}
