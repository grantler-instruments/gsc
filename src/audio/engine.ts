import { getLoopPlayCount } from "../lib/loop";
import { getMediaDurationSec } from "../lib/media-duration";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { resolveEffectivePan, resolveEffectiveVolume } from "../stores/fade";
import type { Cue } from "../types/cue";
import { getCachedAudioBuffer, loadAudioBuffer } from "./buffer-cache";
import {
  startVideoVoice,
  stopVideoVoice,
  updateVideoVoiceLevels,
  type VideoVoice,
} from "./video-voice";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampPan(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function playbackWindow(cue: Cue, bufferDuration: number) {
  const inT = Math.max(0, cue.inTime ?? 0);
  const endSec =
    cue.outTime !== undefined
      ? Math.min(bufferDuration, Math.max(inT, cue.outTime))
      : bufferDuration;
  return {
    offsetSec: inT,
    durationSec: Math.max(0.01, endSec - inT),
  };
}

interface ActiveVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  panner: StereoPannerNode;
  goAtMs: number;
}

type VoiceEndedHandler = (cueId: string) => void;

/**
 * Browser playback via Web Audio API (reliable in Chrome/Brave).
 * Video cues use MediaElementSource; audio cues use decoded buffers.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private voices = new Map<string, ActiveVoice>();
  private videoVoices = new Map<string, VideoVoice>();
  private syncGeneration = 0;
  private onVoiceEndedHandler: VoiceEndedHandler | null = null;

  onVoiceEnded(handler: VoiceEndedHandler | null): void {
    this.onVoiceEndedHandler = handler;
  }

  async unlock(): Promise<AudioContext> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  private async ensureContext(): Promise<AudioContext> {
    return this.unlock();
  }

  private handleVoiceEnded(cueId: string): void {
    this.onVoiceEndedHandler?.(cueId);
  }

  private stopVoice(cueId: string): void {
    const voice = this.voices.get(cueId);
    if (!voice) return;
    voice.source.onended = null;
    try {
      voice.source.stop();
    } catch {
      /* already stopped */
    }
    voice.source.disconnect();
    voice.gain.disconnect();
    voice.panner.disconnect();
    this.voices.delete(cueId);
  }

  private stopVideoVoice(cueId: string): void {
    const voice = this.videoVoices.get(cueId);
    if (!voice) return;
    stopVideoVoice(voice);
    this.videoVoices.delete(cueId);
  }

  private startVoice(
    cue: Cue,
    buffer: AudioBuffer,
    ctx: AudioContext,
    masterVolume: number,
    goAtMs: number,
  ): void {
    const { offsetSec, durationSec } = playbackWindow(cue, buffer.duration);
    const loopPlayCount = getLoopPlayCount(cue);
    const shouldLoop = loopPlayCount !== 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value =
      clamp01(resolveEffectiveVolume(cue.id, cue.volume ?? 1)) * clamp01(masterVolume);

    const panner = ctx.createStereoPanner();
    panner.pan.value = clampPan(resolveEffectivePan(cue.id, cue.pan ?? 0));

    source.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);

    const when = ctx.currentTime;

    if (shouldLoop) {
      source.loop = true;
      source.loopStart = offsetSec;
      source.loopEnd = offsetSec + durationSec;
      source.start(when, offsetSec);

      if (loopPlayCount !== "inf") {
        source.stop(when + durationSec * loopPlayCount);
      }
    } else {
      source.start(when, offsetSec, durationSec);
    }

    source.onended = () => {
      if (this.voices.get(cue.id)?.source === source) {
        this.voices.delete(cue.id);
        this.handleVoiceEnded(cue.id);
      }
    };

    this.voices.set(cue.id, { source, gain, panner, goAtMs });
  }

  private updateVoiceLevels(cueId: string, cue: Cue, masterVolume: number): void {
    const voice = this.voices.get(cueId);
    if (!voice) return;
    voice.gain.gain.value =
      clamp01(resolveEffectiveVolume(cueId, cue.volume ?? 1)) * clamp01(masterVolume);
    voice.panner.pan.value = clampPan(resolveEffectivePan(cueId, cue.pan ?? 0));
  }

  /** Refresh gain and pan for all active voices (e.g. during a fade). */
  updateActiveVoiceLevels(cues: Cue[], masterVolume: number): void {
    for (const cueId of this.voices.keys()) {
      const cue = cues.find((c) => c.id === cueId);
      if (cue) {
        this.updateVoiceLevels(cueId, cue, masterVolume);
      }
    }
    for (const voice of this.videoVoices.values()) {
      const cue = cues.find((c) => c.id === voice.cueId);
      if (cue) {
        updateVideoVoiceLevels(voice, cue, masterVolume);
      }
    }
  }

  async sync(
    activeCueIds: string[],
    cues: Cue[],
    masterVolume: number,
    cueStartedAtMs: Record<string, number> = {},
  ): Promise<void> {
    const generation = ++this.syncGeneration;

    try {
      const ctx = await this.ensureContext();
      const cueById = new Map(cues.map((c) => [c.id, c]));
      const targetAudio = new Set<string>();
      const targetVideo = new Set<string>();

      for (const id of activeCueIds) {
        const cue = cueById.get(id);
        if (!cue?.assetPath) continue;
        if (cue.type === "audio") targetAudio.add(id);
        if (cue.type === "video") targetVideo.add(id);
      }

      for (const id of [...this.voices.keys()]) {
        if (!targetAudio.has(id)) {
          this.stopVoice(id);
        }
      }

      for (const id of [...this.videoVoices.keys()]) {
        if (!targetVideo.has(id)) {
          this.stopVideoVoice(id);
        }
      }

      if (generation !== this.syncGeneration) return;

      for (const cueId of targetVideo) {
        const cue = cueById.get(cueId);
        if (!cue) continue;
        const goAtMs = cueStartedAtMs[cueId] ?? Date.now();

        if (this.videoVoices.has(cueId)) {
          const existing = this.videoVoices.get(cueId);
          if (!existing) continue;
          if (existing.goAtMs === goAtMs) {
            updateVideoVoiceLevels(existing, cue, masterVolume);
            continue;
          }
          this.stopVideoVoice(cueId);
        }

        if (cue.assetPath) {
          await resolveAssetBlob(cue.assetPath);
        }
        if (generation !== this.syncGeneration) return;

        const voice = startVideoVoice(cue, ctx, masterVolume, goAtMs, (id) => {
          if (this.videoVoices.get(id) === voice) {
            this.stopVideoVoice(id);
            this.handleVoiceEnded(id);
          }
        });

        if (!voice) {
          console.warn(`[audio] Missing video asset in VFS: ${cue.assetPath}`);
          continue;
        }

        if (generation !== this.syncGeneration) {
          stopVideoVoice(voice);
          return;
        }

        this.videoVoices.set(cueId, voice);
      }

      for (const cueId of targetAudio) {
        const cue = cueById.get(cueId);
        if (!cue?.assetPath) continue;
        const assetPath = cue.assetPath;
        const goAtMs = cueStartedAtMs[cueId] ?? Date.now();

        if (this.voices.has(cueId)) {
          const existing = this.voices.get(cueId);
          if (!existing) continue;
          if (existing.goAtMs === goAtMs) {
            this.updateVoiceLevels(cueId, cue, masterVolume);
            continue;
          }
          this.stopVoice(cueId);
        }

        let buffer = getCachedAudioBuffer(assetPath);
        if (!buffer) {
          try {
            buffer = (await loadAudioBuffer(assetPath, ctx)) ?? undefined;
          } catch (err) {
            console.warn(`[audio] Could not decode ${assetPath}`, err);
            continue;
          }
        }
        if (!buffer) {
          console.warn(`[audio] Missing asset in VFS: ${assetPath}`);
          continue;
        }

        if (generation !== this.syncGeneration) return;

        try {
          this.startVoice(cue, buffer, ctx, masterVolume, goAtMs);
        } catch (err) {
          console.warn(`[audio] Could not play ${assetPath}`, err);
        }
      }

      const missingAudio =
        targetAudio.size > 0 && [...targetAudio].every((id) => !this.voices.has(id));
      const missingVideo =
        targetVideo.size > 0 && [...targetVideo].every((id) => !this.videoVoices.has(id));

      if (missingAudio || missingVideo) {
        console.warn(
          "[audio] Could not start active cue(s) — re-import assets after opening a project.",
        );
      }
    } catch (err) {
      console.error("[audio] sync failed", err);
    }
  }

  getAssetDurationSec(assetPath: string): number | undefined {
    return getCachedAudioBuffer(assetPath)?.duration ?? getMediaDurationSec(assetPath);
  }

  async stopAll(): Promise<void> {
    this.syncGeneration++;
    for (const id of [...this.voices.keys()]) {
      this.stopVoice(id);
    }
    for (const id of [...this.videoVoices.keys()]) {
      this.stopVideoVoice(id);
    }
  }
}

export const audioEngine = new AudioEngine();
