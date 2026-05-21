import { getLoopPlayCount, isLoopableMediaCue } from "./loop";
import type { Cue } from "../types/cue";

const DEFAULT_MEDIA_SEC = 5;
const DEFAULT_MIDI_SEC = 0.15;

/** Image cues without a duration stay on screen until a stop cue. */
export function isImageInfiniteHold(cue: Cue): boolean {
  return cue.type === "image" && cue.outTime === undefined;
}

export function cueShowsPlaybackProgress(cue: Cue): boolean {
  if (isImageInfiniteHold(cue)) return false;
  return (
    cue.type === "audio" ||
    cue.type === "video" ||
    cue.type === "image" ||
    cue.type === "midi"
  );
}

/** Length of one in→out slice in seconds (excludes fade padding). */
export function getPlaybackSliceSec(
  cue: Cue,
  sourceDurationSec?: number,
): number {
  if (cue.type === "midi") {
    return DEFAULT_MIDI_SEC;
  }

  if (cue.type === "image") {
    if (cue.outTime === undefined) {
      return 1;
    }
    return Math.max(0.01, cue.outTime);
  }

  const inT = cue.inTime ?? 0;
  if (cue.outTime !== undefined) {
    return Math.max(0.01, cue.outTime - inT);
  }

  if (sourceDurationSec !== undefined) {
    return Math.max(0.01, sourceDurationSec - inT);
  }

  return DEFAULT_MEDIA_SEC;
}

export interface PlaybackBounds {
  sliceSec: number;
  endSec: number;
  inTime: number;
  loopCount: number | "inf";
  looping: boolean;
  /** Image with no duration — held until stop cue. */
  imageHoldInfinite?: boolean;
}

/** Snapshot timing for one GO — avoids bar jumps when duration loads mid-playback. */
export function createPlaybackBounds(
  cue: Cue,
  sourceDurationSec?: number,
): PlaybackBounds {
  const inTime = cue.inTime ?? 0;
  const sliceSec = getPlaybackSliceSec(cue, sourceDurationSec);

  if (isImageInfiniteHold(cue)) {
    return {
      sliceSec,
      endSec: sliceSec,
      inTime: 0,
      loopCount: 1,
      looping: false,
      imageHoldInfinite: true,
    };
  }

  const endSec =
    cue.type === "image"
      ? sliceSec
      : cue.outTime !== undefined
        ? cue.outTime
        : sourceDurationSec !== undefined
          ? sourceDurationSec
          : inTime + sliceSec;
  const loopCount = isLoopableMediaCue(cue) ? getLoopPlayCount(cue) : 1;

  return {
    sliceSec,
    endSec,
    inTime,
    loopCount,
    looping: loopCount === "inf",
  };
}

export interface PlaybackProgressSnapshot {
  /** Current playhead in the source file (seconds). */
  positionSec: number;
  /** End of the active slice in the file (seconds). */
  endSec: number;
  /** Progress through the current run (0–1). */
  progress: number;
  /** Whether the cue is in an infinite loop (progress wraps). */
  looping: boolean;
  /** Current loop iteration (1-based). Set when loop count > 1. */
  loopIteration?: number;
  /** Total loops configured, or "inf". */
  loopTotal?: number | "inf";
}

export function computePlaybackProgressWithBounds(
  bounds: PlaybackBounds,
  elapsedSec: number,
): PlaybackProgressSnapshot {
  const { sliceSec, endSec, inTime, loopCount, looping } = bounds;

  let progress: number;
  let positionSec: number;
  let loopIteration: number | undefined;
  let loopTotal: number | "inf" | undefined;

  const iterationIndex =
    sliceSec > 0 ? Math.floor(Math.max(0, elapsedSec) / sliceSec) : 0;

  if (looping) {
    const inSlice = sliceSec > 0 ? elapsedSec % sliceSec : 0;
    progress = sliceSec > 0 ? inSlice / sliceSec : 0;
    positionSec = inTime + inSlice;
    loopIteration = iterationIndex + 1;
    loopTotal = "inf";
  } else {
    const totalRunSec = sliceSec * (loopCount as number);
    const clamped = Math.min(Math.max(0, elapsedSec), totalRunSec);
    progress = totalRunSec > 0 ? clamped / totalRunSec : 1;
    const inSlice = sliceSec > 0 ? clamped % sliceSec : 0;
    positionSec = inTime + inSlice;

    if (loopCount !== 1) {
      loopIteration = Math.min(iterationIndex + 1, loopCount as number);
      loopTotal = loopCount as number;
    }
  }

  return {
    positionSec,
    endSec,
    progress: Math.max(0, Math.min(1, progress)),
    looping,
    loopIteration,
    loopTotal,
  };
}

export function isFinitePlaybackComplete(
  bounds: PlaybackBounds,
  elapsedSec: number,
): boolean {
  if (bounds.imageHoldInfinite || bounds.looping) return false;
  const totalRunSec = bounds.sliceSec * (bounds.loopCount as number);
  return elapsedSec >= totalRunSec;
}

export function computePlaybackProgress(
  cue: Cue,
  elapsedSec: number,
  sourceDurationSec?: number,
): PlaybackProgressSnapshot {
  return computePlaybackProgressWithBounds(
    createPlaybackBounds(cue, sourceDurationSec),
    elapsedSec,
  );
}

export function cueNeedsKnownDuration(cue: Cue): boolean {
  return (
    (cue.type === "audio" || cue.type === "video") && cue.assetPath !== undefined
  );
}
