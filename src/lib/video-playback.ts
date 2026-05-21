import { getLoopPlayCount } from "./loop";
import type { Cue } from "../types/cue";
import type { OutputLayer } from "../types/output";

export function videoPlaybackWindow(cue: Cue, mediaDuration: number) {
  const inT = Math.max(0, cue.inTime ?? 0);
  const endSec =
    cue.outTime !== undefined
      ? Math.min(mediaDuration, Math.max(inT, cue.outTime))
      : mediaDuration;
  return {
    offsetSec: inT,
    durationSec: Math.max(0.01, endSec - inT),
  };
}

export function sliceEndSec(inTime: number, sliceSec: number): number {
  return inTime + sliceSec;
}

export function isVideoLooping(cue: Cue): boolean {
  return getLoopPlayCount(cue) !== 1;
}

export function isOutputLayerLooping(layer: OutputLayer): boolean {
  return layer.loopCount !== 1;
}

export function elapsedVideoSec(
  goAtMs: number,
  nowMs = performance.now(),
): number {
  return Math.max(0, (nowMs - goAtMs) / 1000);
}

export function videoTargetTime(
  cue: Cue,
  mediaDuration: number,
  goAtMs: number,
  nowMs = performance.now(),
): number {
  const { offsetSec, durationSec } = videoPlaybackWindow(cue, mediaDuration);
  const loopPlayCount = getLoopPlayCount(cue);
  const elapsed = elapsedVideoSec(goAtMs, nowMs);

  if (loopPlayCount === "inf") {
    const inSlice = durationSec > 0 ? elapsed % durationSec : 0;
    return offsetSec + inSlice;
  }

  const totalRun = durationSec * loopPlayCount;
  const clamped = Math.min(elapsed, totalRun);
  const inSlice = durationSec > 0 ? clamped % durationSec : 0;
  return offsetSec + inSlice;
}

export function outputLayerTargetTime(
  layer: OutputLayer,
  nowMs = performance.now(),
): number {
  const elapsed = elapsedVideoSec(layer.goAtMs, nowMs);

  if (layer.loopCount === "inf") {
    const inSlice = layer.sliceSec > 0 ? elapsed % layer.sliceSec : 0;
    return layer.inTime + inSlice;
  }

  const totalRun = layer.sliceSec * layer.loopCount;
  const clamped = Math.min(elapsed, totalRun);
  const inSlice = layer.sliceSec > 0 ? clamped % layer.sliceSec : 0;
  return layer.inTime + inSlice;
}

export function isVideoPlaybackComplete(
  cue: Cue,
  mediaDuration: number,
  goAtMs: number,
  nowMs = performance.now(),
): boolean {
  const loopPlayCount = getLoopPlayCount(cue);
  if (loopPlayCount === "inf") return false;
  const { durationSec } = videoPlaybackWindow(cue, mediaDuration);
  return elapsedVideoSec(goAtMs, nowMs) >= durationSec * loopPlayCount;
}

export function isOutputLayerPlaybackComplete(
  layer: OutputLayer,
  nowMs = performance.now(),
): boolean {
  if (layer.loopCount === "inf") return false;
  const elapsed = elapsedVideoSec(layer.goAtMs, nowMs);
  return elapsed >= layer.sliceSec * layer.loopCount;
}

/** True when the element hit the slice out point and should wrap for looping. */
export function shouldWrapVideoAtSliceEnd(
  currentTime: number,
  endSec: number,
  marginSec = 0.05,
): boolean {
  return currentTime >= endSec - marginSec;
}
