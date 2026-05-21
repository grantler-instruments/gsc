import { getLoopPlayCount } from "../lib/loop";
import type { Cue } from "../types/cue";
import { vfsGetObjectUrl } from "../vfs/engine";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function playbackWindow(cue: Cue, mediaDuration: number) {
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

function elapsedSecSinceGo(goAtMs: number): number {
  return Math.max(0, (performance.now() - goAtMs) / 1000);
}

function positionForGo(cue: Cue, mediaDuration: number, goAtMs: number): number {
  const { offsetSec, durationSec } = playbackWindow(cue, mediaDuration);
  const loopPlayCount = getLoopPlayCount(cue);
  const elapsed = elapsedSecSinceGo(goAtMs);

  if (loopPlayCount === "inf") {
    const inSlice = durationSec > 0 ? elapsed % durationSec : 0;
    return offsetSec + inSlice;
  }

  const totalRun = durationSec * loopPlayCount;
  const clamped = Math.min(elapsed, totalRun);
  const inSlice = durationSec > 0 ? clamped % durationSec : 0;
  return offsetSec + inSlice;
}

function isPlaybackComplete(cue: Cue, mediaDuration: number, goAtMs: number): boolean {
  const loopPlayCount = getLoopPlayCount(cue);
  if (loopPlayCount === "inf") return false;
  const { durationSec } = playbackWindow(cue, mediaDuration);
  return elapsedSecSinceGo(goAtMs) >= durationSec * loopPlayCount;
}

export interface VideoVoice {
  cueId: string;
  video: HTMLVideoElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  goAtMs: number;
  loopIteration: number;
}

export type VideoVoiceEndedHandler = (cueId: string) => void;

export function startVideoVoice(
  cue: Cue,
  ctx: AudioContext,
  masterVolume: number,
  goAtMs: number,
  onEnded: VideoVoiceEndedHandler,
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
  gain.gain.value = clamp01(cue.volume ?? 1) * clamp01(masterVolume);
  source.connect(gain);
  gain.connect(ctx.destination);

  const voice: VideoVoice = {
    cueId: cue.id,
    video,
    source,
    gain,
    goAtMs,
    loopIteration: 0,
  };

  const loopPlayCount = getLoopPlayCount(cue);

  const seekAndPlay = () => {
    if (!Number.isFinite(video.duration)) return;

    if (isPlaybackComplete(cue, video.duration, goAtMs)) {
      onEnded(cue.id);
      return;
    }

    const target = positionForGo(cue, video.duration, goAtMs);
    try {
      video.currentTime = target;
    } catch {
      /* not seekable yet */
    }

    void video.play().catch((err) => {
      console.warn("[audio] Video voice play blocked — interact with the page first", err);
    });
  };

  const handleTimeUpdate = () => {
    if (!Number.isFinite(video.duration)) return;

    const { offsetSec, durationSec } = playbackWindow(cue, video.duration);
    const endSec = offsetSec + durationSec;

    if (loopPlayCount === "inf") {
      if (video.currentTime >= endSec - 0.05) {
        video.currentTime = offsetSec;
      }
      return;
    }

    if (video.currentTime >= endSec - 0.05) {
      voice.loopIteration += 1;
      if (voice.loopIteration >= loopPlayCount) {
        video.pause();
        onEnded(cue.id);
        return;
      }
      video.currentTime = offsetSec;
    }
  };

  const handleEnded = () => {
    if (loopPlayCount === "inf") return;
    voice.loopIteration += 1;
    if (voice.loopIteration >= loopPlayCount) {
      onEnded(cue.id);
      return;
    }
    const { offsetSec } = playbackWindow(cue, video.duration);
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

export function updateVideoVoiceGain(
  voice: VideoVoice,
  cue: Cue,
  masterVolume: number,
): void {
  voice.gain.gain.value = clamp01(cue.volume ?? 1) * clamp01(masterVolume);
}

export function stopVideoVoice(voice: VideoVoice): void {
  voice.video.pause();
  voice.video.removeAttribute("src");
  voice.video.load();
  voice.video.remove();
  voice.source.disconnect();
  voice.gain.disconnect();
}
