import type { Cue } from "../types/cue";
import type { OutputLayer } from "../types/output";
import { getLoopPlayCount } from "./loop";
import {
  driftSecWithinSlice,
  isOutputLayerLooping,
  isOutputLayerPlaybackComplete,
  isVideoLooping,
  isVideoPlaybackComplete,
  outputLayerTargetTime,
  shouldWrapVideoAtSliceEnd,
  sliceEndSec,
  videoPlaybackWindow,
  videoTargetTime,
} from "./video-playback";

/** Re-seek when transport and element drift apart (loaded CI / compositor load). */
export const TRANSPORT_CLOCK_SYNC_DRIFT_SEC = 0.08;
export const TRANSPORT_CLOCK_SYNC_MIN_INTERVAL_MS = 500;

export function seekVideoElement(video: HTMLVideoElement, timeSec: number): void {
  const target = Math.max(0, timeSec);
  if (typeof video.fastSeek === "function") {
    try {
      video.fastSeek(target);
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    video.currentTime = target;
  } catch {
    /* seek not ready */
  }
}

export interface TransportVideoTiming {
  inTime: number;
  sliceSec: number;
  loopCount: number | "inf";
  goAtMs: number;
  targetTime(nowMs?: number): number;
  isLooping(): boolean;
  isPlaybackComplete(nowMs?: number): boolean;
}

export function transportTimingFromOutputLayer(layer: OutputLayer): TransportVideoTiming {
  return {
    inTime: layer.inTime,
    sliceSec: layer.sliceSec,
    loopCount: layer.loopCount,
    goAtMs: layer.goAtMs,
    targetTime: (nowMs) => outputLayerTargetTime(layer, nowMs),
    isLooping: () => isOutputLayerLooping(layer),
    isPlaybackComplete: (nowMs) => isOutputLayerPlaybackComplete(layer, nowMs),
  };
}

export function transportTimingFromCue(
  cue: Cue,
  mediaDuration: number,
  goAtMs: number,
): TransportVideoTiming {
  const { offsetSec, durationSec } = videoPlaybackWindow(cue, mediaDuration);
  const loopCount = getLoopPlayCount(cue);
  return {
    inTime: offsetSec,
    sliceSec: durationSec,
    loopCount,
    goAtMs,
    targetTime: (nowMs) => videoTargetTime(cue, mediaDuration, goAtMs, nowMs),
    isLooping: () => isVideoLooping(cue),
    isPlaybackComplete: (nowMs) => isVideoPlaybackComplete(cue, mediaDuration, goAtMs, nowMs),
  };
}

export interface TransportVideoSyncState {
  loopIterations: number;
  loopWrapped: boolean;
  lastClockSyncMs: number;
}

export function createTransportVideoSyncState(): TransportVideoSyncState {
  return { loopIterations: 0, loopWrapped: false, lastClockSyncMs: 0 };
}

export function resetTransportVideoSyncState(state: TransportVideoSyncState): void {
  state.loopIterations = 0;
  state.loopWrapped = false;
  state.lastClockSyncMs = 0;
}

export interface TransportVideoSyncHandlers {
  onEnded?: () => void;
  syncDrift?: boolean;
}

/** Seek to the transport clock; returns false when non-looping playback is complete. */
export function seekTransportVideoToClock(
  video: HTMLVideoElement,
  timing: TransportVideoTiming,
  handlers: Pick<TransportVideoSyncHandlers, "onEnded"> = {},
): boolean {
  if (video.readyState < HTMLMediaElement.HAVE_METADATA || !Number.isFinite(video.duration)) {
    return true;
  }

  if (!timing.isLooping() && timing.isPlaybackComplete()) {
    handlers.onEnded?.();
    return false;
  }

  seekVideoElement(video, timing.targetTime());
  return true;
}

function syncVideoDriftToTransportClock(
  video: HTMLVideoElement,
  timing: TransportVideoTiming,
  state: TransportVideoSyncState,
): void {
  if (video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
  if (!Number.isFinite(video.duration)) return;
  if (!timing.isLooping() && timing.isPlaybackComplete()) return;

  const nowMs = Date.now();
  if (nowMs - state.lastClockSyncMs < TRANSPORT_CLOCK_SYNC_MIN_INTERVAL_MS) return;

  const targetSec = timing.targetTime(nowMs);
  const driftSec = driftSecWithinSlice(
    video.currentTime,
    targetSec,
    timing.sliceSec,
    timing.inTime,
  );
  if (driftSec <= TRANSPORT_CLOCK_SYNC_DRIFT_SEC) return;

  seekVideoElement(video, targetSec);
  state.lastClockSyncMs = nowMs;
}

export function onTransportVideoTimeUpdate(
  video: HTMLVideoElement,
  timing: TransportVideoTiming,
  state: TransportVideoSyncState,
  handlers: TransportVideoSyncHandlers = {},
): void {
  if (!Number.isFinite(video.duration)) return;

  if (handlers.syncDrift !== false) {
    syncVideoDriftToTransportClock(video, timing, state);
  }

  if (!timing.isLooping()) return;

  const endSec = sliceEndSec(timing.inTime, timing.sliceSec);
  if (!shouldWrapVideoAtSliceEnd(video.currentTime, endSec)) {
    state.loopWrapped = false;
    return;
  }
  if (state.loopWrapped) return;
  state.loopWrapped = true;

  if (timing.loopCount === "inf") {
    seekVideoElement(video, timing.targetTime());
    if (video.paused) {
      void video.play().catch(() => {});
    }
    return;
  }

  const next = state.loopIterations + 1;
  if (next >= (timing.loopCount as number)) {
    video.pause();
    handlers.onEnded?.();
    return;
  }

  state.loopIterations = next;
  seekVideoElement(video, timing.targetTime());
  void video.play().catch(() => {});
}

export function onTransportVideoEnded(
  video: HTMLVideoElement,
  timing: TransportVideoTiming,
  state: TransportVideoSyncState,
  handlers: TransportVideoSyncHandlers = {},
): void {
  if (!Number.isFinite(video.duration)) return;

  if (timing.loopCount === "inf") {
    seekVideoElement(video, timing.targetTime());
    void video.play().catch(() => {});
    return;
  }

  if (!timing.isLooping()) {
    handlers.onEnded?.();
    return;
  }

  state.loopIterations += 1;
  if (state.loopIterations >= (timing.loopCount as number)) {
    handlers.onEnded?.();
    return;
  }

  seekVideoElement(video, timing.targetTime());
  void video.play().catch(() => {});
}

export interface TransportVideoSyncAttachment {
  state: TransportVideoSyncState;
  seekToClock: () => boolean;
  seekAndPlay: () => void;
  resetState: () => void;
  detach: () => void;
}

/** Wire timeupdate/ended handlers that keep a video element on the transport clock. */
export function attachTransportSyncedVideo(
  video: HTMLVideoElement,
  getTiming: () => TransportVideoTiming,
  handlers: TransportVideoSyncHandlers = {},
): TransportVideoSyncAttachment {
  const state = createTransportVideoSyncState();

  const seekToClock = () => seekTransportVideoToClock(video, getTiming(), handlers);

  const seekAndPlay = () => {
    if (seekToClock()) {
      void video.play().catch(() => {});
    }
  };

  const onTimeUpdate = () => {
    onTransportVideoTimeUpdate(video, getTiming(), state, handlers);
  };

  const onEnded = () => {
    onTransportVideoEnded(video, getTiming(), state, handlers);
  };

  video.addEventListener("timeupdate", onTimeUpdate);
  video.addEventListener("ended", onEnded);

  return {
    state,
    seekToClock,
    seekAndPlay,
    resetState: () => resetTransportVideoSyncState(state),
    detach: () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    },
  };
}
