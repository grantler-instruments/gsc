import {
  attachTransportSyncedVideo,
  type TransportVideoSyncAttachment,
  transportTimingFromCue,
} from "../lib/transport-synced-video";
import { resolveEffectivePan, resolveEffectiveVolume } from "../stores/fade";
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
  cue: Cue;
  sync: TransportVideoSyncAttachment;
}

export type VideoVoiceEndedHandler = (cueId: string) => void;

export function startVideoVoice(
  cue: Cue,
  ctx: AudioContext,
  goAtMs: number,
  onEnded: VideoVoiceEndedHandler,
  connectPanner: (panner: StereoPannerNode) => string | undefined,
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
  const audioBusId = connectPanner(panner);

  const voice: VideoVoice = {
    cueId: cue.id,
    video,
    source,
    gain,
    panner,
    goAtMs,
    loopIteration: 0,
    audioBusId,
    cue,
    sync: undefined as unknown as TransportVideoSyncAttachment,
  };

  voice.sync = attachTransportSyncedVideo(
    video,
    () =>
      transportTimingFromCue(
        cue,
        Number.isFinite(video.duration) ? video.duration : 0,
        voice.goAtMs,
      ),
    {
      onEnded: () => onEnded(cue.id),
    },
  );

  const seekAndPlay = () => {
    voice.sync.seekAndPlay();
  };

  video.addEventListener("loadedmetadata", seekAndPlay);

  if (video.readyState >= 1) {
    seekAndPlay();
  }

  return voice;
}

export function seekVideoVoice(voice: VideoVoice, _cue: Cue, goAtMs: number): void {
  voice.goAtMs = goAtMs;
  voice.sync.resetState();

  if (!Number.isFinite(voice.video.duration)) return;

  voice.sync.seekToClock();
}

export function updateVideoVoiceLevels(voice: VideoVoice, cue: Cue): void {
  voice.gain.gain.value = clamp01(resolveEffectiveVolume(cue.id, cue.volume ?? 1));
  voice.panner.pan.value = clampPan(resolveEffectivePan(cue.id, cue.pan ?? 0));
}

export function stopVideoVoice(voice: VideoVoice): void {
  voice.sync.detach();
  voice.video.pause();
  voice.video.removeAttribute("src");
  voice.video.load();
  voice.video.remove();
  voice.source.disconnect();
  voice.gain.disconnect();
  voice.panner.disconnect();
}
