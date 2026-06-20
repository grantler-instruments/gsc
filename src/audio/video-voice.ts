import { resolveCueAudioBusId } from "../lib/audio-buses";
import { getLoopPlayCount } from "../lib/loop";
import {
  isVideoLooping,
  isVideoPlaybackComplete,
  shouldWrapVideoAtSliceEnd,
  videoPlaybackWindow,
  videoTargetTime,
} from "../lib/video-playback";
import { resolveEffectivePan, resolveEffectiveVolume } from "../stores/fade";
import type { AudioBus } from "../types/audio-bus";
import type { Cue } from "../types/cue";
import { vfsGetObjectUrl } from "../vfs/engine";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampPan(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

export interface VideoVoice {
  cueId: string;
  video: HTMLVideoElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  panner: StereoPannerNode;
  goAtMs: number;
  loopIteration: number;
  audioBusId?: string;
}

export type VideoVoiceEndedHandler = (cueId: string) => void;

export function startVideoVoice(
  cue: Cue,
  ctx: AudioContext,
  goAtMs: number,
  onEnded: VideoVoiceEndedHandler,
  destination: AudioNode,
  audioBuses: AudioBus[] = [],
): VideoVoice | null {
  const objectUrl = cue.assetPath ? vfsGetObjectUrl(cue.assetPath) : undefined;
  if (!objectUrl) return null;

  const video = document.createElement("video");
  video.src = objectUrl;
  video.playsInline = true;
  video.preload = "auto";
  video.style.display = "none";
  document.body.appendChild(video);

  const source = ctx.createMediaElementSource(video);
  const gain = ctx.createGain();
  gain.gain.value = clamp01(resolveEffectiveVolume(cue.id, cue.volume ?? 1));

  const panner = ctx.createStereoPanner();
  panner.pan.value = clampPan(resolveEffectivePan(cue.id, cue.pan ?? 0));

  source.connect(gain);
  gain.connect(panner);
  panner.connect(destination);

  const voice: VideoVoice = {
    cueId: cue.id,
    video,
    source,
    gain,
    panner,
    goAtMs,
    loopIteration: 0,
    audioBusId: resolveCueAudioBusId(cue, audioBuses),
  };

  const loopPlayCount = getLoopPlayCount(cue);
  const looping = isVideoLooping(cue);

  const seekToClock = () => {
    if (!Number.isFinite(video.duration)) return;

    if (isVideoPlaybackComplete(cue, video.duration, goAtMs)) {
      onEnded(cue.id);
      return;
    }

    const target = videoTargetTime(cue, video.duration, goAtMs);
    try {
      video.currentTime = target;
    } catch {
      /* not seekable yet */
    }
  };

  const seekAndPlay = () => {
    seekToClock();
    void video.play().catch((err) => {
      console.warn("[audio] Video voice play blocked — interact with the page first", err);
    });
  };

  const wrapLoopIfNeeded = () => {
    if (!Number.isFinite(video.duration)) return;

    const { offsetSec, durationSec } = videoPlaybackWindow(cue, video.duration);
    const endSec = offsetSec + durationSec;

    if (!looping) return;

    if (shouldWrapVideoAtSliceEnd(video.currentTime, endSec)) {
      if (loopPlayCount === "inf") {
        video.currentTime = videoTargetTime(cue, video.duration, goAtMs);
        if (video.paused) {
          void video.play().catch(() => {});
        }
        return;
      }

      voice.loopIteration += 1;
      if (voice.loopIteration >= loopPlayCount) {
        video.pause();
        onEnded(cue.id);
        return;
      }
      video.currentTime = offsetSec;
    }
  };

  const handleTimeUpdate = () => {
    wrapLoopIfNeeded();
  };

  const handleEnded = () => {
    if (!Number.isFinite(video.duration)) return;

    const { offsetSec } = videoPlaybackWindow(cue, video.duration);

    if (loopPlayCount === "inf") {
      video.currentTime = videoTargetTime(cue, video.duration, goAtMs);
      void video.play().catch(() => {});
      return;
    }

    if (!looping) {
      onEnded(cue.id);
      return;
    }

    voice.loopIteration += 1;
    if (voice.loopIteration >= loopPlayCount) {
      onEnded(cue.id);
      return;
    }
    video.currentTime = offsetSec;
    void video.play().catch(() => {});
  };

  video.addEventListener("loadedmetadata", seekAndPlay);
  video.addEventListener("timeupdate", handleTimeUpdate);
  video.addEventListener("ended", handleEnded);

  if (video.readyState >= 1) {
    seekAndPlay();
  }

  return voice;
}

export function seekVideoVoice(voice: VideoVoice, cue: Cue, goAtMs: number): void {
  voice.goAtMs = goAtMs;
  voice.loopIteration = 0;

  if (!Number.isFinite(voice.video.duration)) return;

  const target = videoTargetTime(cue, voice.video.duration, goAtMs);
  try {
    voice.video.currentTime = target;
  } catch {
    /* not seekable yet */
  }
}

export function updateVideoVoiceLevels(voice: VideoVoice, cue: Cue): void {
  voice.gain.gain.value = clamp01(resolveEffectiveVolume(cue.id, cue.volume ?? 1));
  voice.panner.pan.value = clampPan(resolveEffectivePan(cue.id, cue.pan ?? 0));
}

export function stopVideoVoice(voice: VideoVoice): void {
  voice.video.pause();
  voice.video.removeAttribute("src");
  voice.video.load();
  voice.video.remove();
  voice.source.disconnect();
  voice.gain.disconnect();
  voice.panner.disconnect();
}
