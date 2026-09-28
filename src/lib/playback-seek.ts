import type { Cue } from "../types/cue";
import { createPlaybackBounds } from "./playback-slice";
import { transportNowMs } from "./transport-clock";

/** Clamp a file position to the cue's active in→out slice. */
export function clampSeekPositionSec(
  cue: Cue,
  positionSec: number,
  sourceDurationSec?: number,
): number {
  const bounds = createPlaybackBounds(cue, sourceDurationSec);
  const min = bounds.inTime;
  const max = bounds.endSec;
  return Math.max(min, Math.min(max, positionSec));
}

/** Wall-clock ms so elapsed playback matches `positionSec` within the cue slice. */
export function goAtMsForSeekPosition(
  cue: Cue,
  positionSec: number,
  sourceDurationSec?: number,
  nowMs = transportNowMs(),
): number {
  const bounds = createPlaybackBounds(cue, sourceDurationSec);
  const clamped = clampSeekPositionSec(cue, positionSec, sourceDurationSec);
  const inSlice = Math.max(0, clamped - bounds.inTime);
  return nowMs - inSlice * 1000;
}
