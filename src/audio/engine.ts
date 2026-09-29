import { resolveCueAudioBusId } from "../lib/audio-buses";
import { openAudioInputStream } from "../lib/audio-input";
import { getLoopPlayCount } from "../lib/loop";
import { getMediaDurationSec } from "../lib/media-duration";
import { videoTargetTime } from "../lib/video-playback";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { resolveEffectivePan, resolveEffectiveVolume } from "../stores/fade";
import { usePreferencesStore } from "../stores/preferences";
import type { AudioBus } from "../types/audio-bus";
import type { Cue } from "../types/cue";
import { getCachedAudioBuffer, preloadAudioBuffer } from "./buffer-cache";
import { prepareBusEffects } from "./effects/worklet";
import { audioMeters, cueMeterId } from "./meters";
import { MixerGraph } from "./mixer";
import {
  seekVideoVoice,
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
  audioBusId?: string;
}

interface LiveAudioVoice {
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  splitter?: ChannelSplitterNode;
  gain: GainNode;
  panner: StereoPannerNode;
  audioBusId?: string;
}

type VoiceEndedHandler = (cueId: string) => void;

/**
 * Browser playback via Web Audio API (reliable in Chrome/Brave).
 * Video cues use MediaElementSource; audio cues use decoded buffers. Audio not decoded
 * yet streams through a media element so GO starts at once while the decode runs.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private mixer: MixerGraph | null = null;
  private audioBuses: AudioBus[] = [];
  private masterVolume = 1;
  private voices = new Map<string, ActiveVoice>();
  private liveAudioVoices = new Map<string, LiveAudioVoice>();
  private videoVoices = new Map<string, VideoVoice>();
  private streamedAudioVoices = new Map<string, VideoVoice>();
  private videoVoiceListeners = new Set<() => void>();
  private syncGeneration = 0;
  private onVoiceEndedHandler: VoiceEndedHandler | null = null;

  onVoiceEnded(handler: VoiceEndedHandler | null): void {
    this.onVoiceEndedHandler = handler;
  }

  /**
   * Lets a visual surface adopt the existing media element, avoiding a second
   * video decoder for the same cue.
   */
  getVideoVoiceElement(cueId: string): HTMLVideoElement | undefined {
    return this.videoVoices.get(cueId)?.video;
  }

  subscribeVideoVoices(listener: () => void): () => void {
    this.videoVoiceListeners.add(listener);
    return () => this.videoVoiceListeners.delete(listener);
  }

  private notifyVideoVoiceListeners(): void {
    for (const listener of this.videoVoiceListeners) listener();
  }

  async unlock(): Promise<AudioContext> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    // Resume inside the user gesture, then register processors before connecting voices.
    const resume = this.ctx.state === "suspended" ? this.ctx.resume() : Promise.resolve();
    await Promise.all([resume, prepareBusEffects(this.ctx)]);
    if (!this.mixer) {
      this.mixer = new MixerGraph(this.ctx);
      this.mixer.sync(this.audioBuses);
      this.mixer.setMasterVolume(this.masterVolume);
    }
    return this.ctx;
  }

  private async ensureContext(): Promise<AudioContext> {
    return this.unlock();
  }

  private handleVoiceEnded(cueId: string): void {
    this.onVoiceEndedHandler?.(cueId);
  }

  syncMixer(buses: AudioBus[], masterVolume: number): void {
    this.audioBuses = buses;
    this.masterVolume = masterVolume;
    this.mixer?.sync(buses);
    this.mixer?.setMasterVolume(masterVolume);
  }

  private voiceDestination(cue: Cue): AudioNode {
    const busId = resolveCueAudioBusId(cue, this.audioBuses);
    if (this.mixer) {
      return this.mixer.resolveOutput(busId);
    }
    return this.ctx?.destination ?? (null as unknown as AudioNode);
  }

  private connectVoicePanner(panner: StereoPannerNode, cue: Cue): string | undefined {
    const busId = resolveCueAudioBusId(cue, this.audioBuses);
    panner.connect(this.voiceDestination(cue));
    if (this.ctx) audioMeters.attach(cueMeterId(cue.id), this.ctx, panner);
    return busId;
  }

  private stopVoice(cueId: string): void {
    const voice = this.voices.get(cueId);
    if (!voice) return;
    audioMeters.remove(cueMeterId(cueId));
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
    audioMeters.remove(cueMeterId(cueId));
    stopVideoVoice(voice);
    this.videoVoices.delete(cueId);
    this.notifyVideoVoiceListeners();
  }

  private stopStreamedAudioVoice(cueId: string): void {
    const voice = this.streamedAudioVoices.get(cueId);
    if (!voice) return;
    audioMeters.remove(cueMeterId(cueId));
    stopVideoVoice(voice);
    this.streamedAudioVoices.delete(cueId);
  }

  private stopLiveAudioVoice(cueId: string): void {
    const voice = this.liveAudioVoices.get(cueId);
    if (!voice) return;
    audioMeters.remove(cueMeterId(cueId));
    voice.source.disconnect();
    voice.splitter?.disconnect();
    voice.gain.disconnect();
    voice.panner.disconnect();
    for (const track of voice.stream.getTracks()) track.stop();
    this.liveAudioVoices.delete(cueId);
  }

  private async startLiveAudioVoice(
    cue: Cue,
    ctx: AudioContext,
    generation: number,
  ): Promise<void> {
    if (this.liveAudioVoices.has(cue.id)) return;
    const deviceId = usePreferencesStore.getState().audioInputDeviceId ?? undefined;
    const stream = await openAudioInputStream(deviceId);
    if (generation !== this.syncGeneration || this.liveAudioVoices.has(cue.id)) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }
    const source = ctx.createMediaStreamSource(stream);
    const channel = Math.max(1, Math.floor(cue.liveAudioChannel ?? 1));
    const splitter = ctx.createChannelSplitter(Math.max(channel, 2));
    const gain = ctx.createGain();
    gain.gain.value = clamp01(resolveEffectiveVolume(cue.id, cue.volume ?? 1));
    const panner = ctx.createStereoPanner();
    panner.pan.value = clampPan(resolveEffectivePan(cue.id, cue.pan ?? 0));
    source.connect(splitter);
    splitter.connect(gain, channel - 1);
    gain.connect(panner);
    const audioBusId = this.connectVoicePanner(panner, cue);
    this.liveAudioVoices.set(cue.id, { stream, source, splitter, gain, panner, audioBusId });
  }

  private startVoice(cue: Cue, buffer: AudioBuffer, ctx: AudioContext, goAtMs: number): void {
    const { offsetSec, durationSec } = playbackWindow(cue, buffer.duration);
    const loopPlayCount = getLoopPlayCount(cue);
    const shouldLoop = loopPlayCount !== 1;
    const startOffset = videoTargetTime(cue, buffer.duration, goAtMs);
    const inSlice = Math.max(0, startOffset - offsetSec);
    const remainingInSlice = Math.max(0.01, durationSec - inSlice);

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = clamp01(resolveEffectiveVolume(cue.id, cue.volume ?? 1));

    const panner = ctx.createStereoPanner();
    panner.pan.value = clampPan(resolveEffectivePan(cue.id, cue.pan ?? 0));

    source.connect(gain);
    gain.connect(panner);
    const audioBusId = this.connectVoicePanner(panner, cue);

    const when = ctx.currentTime;

    if (shouldLoop) {
      source.loop = true;
      source.loopStart = offsetSec;
      source.loopEnd = offsetSec + durationSec;
      source.start(when, startOffset);

      if (loopPlayCount !== "inf") {
        const elapsed = (Date.now() - goAtMs) / 1000;
        const totalRun = durationSec * (loopPlayCount as number);
        const remaining = Math.max(0.01, totalRun - elapsed);
        source.stop(when + remaining);
      }
    } else {
      source.start(when, startOffset, remainingInSlice);
    }

    source.onended = () => {
      if (this.voices.get(cue.id)?.source === source) {
        this.stopVoice(cue.id);
        this.handleVoiceEnded(cue.id);
      }
    };

    this.voices.set(cue.id, { source, gain, panner, goAtMs, audioBusId });
  }

  private updateVoiceLevels(cueId: string, cue: Cue): void {
    const voice = this.voices.get(cueId);
    if (!voice) return;
    voice.gain.gain.value = clamp01(resolveEffectiveVolume(cueId, cue.volume ?? 1));
    voice.panner.pan.value = clampPan(resolveEffectivePan(cueId, cue.pan ?? 0));
  }

  private rerouteVoiceIfNeeded(voice: ActiveVoice, cue: Cue): void {
    const nextBusId = resolveCueAudioBusId(cue, this.audioBuses);
    if (voice.audioBusId === nextBusId) return;
    voice.panner.disconnect();
    voice.audioBusId = this.connectVoicePanner(voice.panner, cue);
  }

  private rerouteVideoVoiceIfNeeded(voice: VideoVoice, cue: Cue): void {
    const nextBusId = resolveCueAudioBusId(cue, this.audioBuses);
    if (voice.audioBusId === nextBusId) return;
    voice.panner.disconnect();
    voice.audioBusId = this.connectVoicePanner(voice.panner, cue);
  }

  /** Refresh gain and pan for all active voices (e.g. during a fade). */
  updateActiveVoiceLevels(cues: Cue[]): void {
    for (const cueId of this.voices.keys()) {
      const cue = cues.find((c) => c.id === cueId);
      if (cue) {
        const voice = this.voices.get(cueId);
        if (voice) {
          this.rerouteVoiceIfNeeded(voice, cue);
        }
        this.updateVoiceLevels(cueId, cue);
      }
    }
    for (const voice of [...this.videoVoices.values(), ...this.streamedAudioVoices.values()]) {
      const cue = cues.find((c) => c.id === voice.cueId);
      if (cue) {
        this.rerouteVideoVoiceIfNeeded(voice, cue);
        updateVideoVoiceLevels(voice, cue);
      }
    }
    for (const [cueId, voice] of this.liveAudioVoices) {
      const cue = cues.find((c) => c.id === cueId);
      if (!cue) continue;
      const nextBusId = resolveCueAudioBusId(cue, this.audioBuses);
      if (voice.audioBusId !== nextBusId) {
        voice.panner.disconnect();
        voice.audioBusId = this.connectVoicePanner(voice.panner, cue);
      }
      voice.gain.gain.value = clamp01(resolveEffectiveVolume(cueId, cue.volume ?? 1));
      voice.panner.pan.value = clampPan(resolveEffectivePan(cueId, cue.pan ?? 0));
    }
  }

  async sync(
    activeCueIds: string[],
    cues: Cue[],
    masterVolume: number,
    cueStartedAtMs: Record<string, number> = {},
    audioBuses: AudioBus[] = [],
  ): Promise<void> {
    const generation = ++this.syncGeneration;
    this.syncMixer(audioBuses, masterVolume);

    try {
      const ctx = await this.ensureContext();
      if (generation !== this.syncGeneration) return;
      const cueById = new Map(cues.map((c) => [c.id, c]));
      const targetAudio = new Set<string>();
      const targetLiveAudio = new Set<string>();
      const targetVideo = new Set<string>();

      for (const id of activeCueIds) {
        const cue = cueById.get(id);
        if (!cue) continue;
        if (cue.type === "liveAudio") {
          targetLiveAudio.add(id);
          continue;
        }
        if (!cue.assetPath) continue;
        if (cue.type === "audio" || cue.type === "tts") targetAudio.add(id);
        if (cue.type === "video") targetVideo.add(id);
      }

      for (const id of [...this.voices.keys()]) {
        if (!targetAudio.has(id)) {
          this.stopVoice(id);
        }
      }
      for (const id of [...this.streamedAudioVoices.keys()]) {
        if (!targetAudio.has(id)) this.stopStreamedAudioVoice(id);
      }

      for (const id of [...this.videoVoices.keys()]) {
        if (!targetVideo.has(id)) {
          this.stopVideoVoice(id);
        }
      }
      for (const id of [...this.liveAudioVoices.keys()]) {
        if (!targetLiveAudio.has(id)) this.stopLiveAudioVoice(id);
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
            this.rerouteVideoVoiceIfNeeded(existing, cue);
            updateVideoVoiceLevels(existing, cue);
            continue;
          }
          seekVideoVoice(existing, cue, goAtMs);
          this.rerouteVideoVoiceIfNeeded(existing, cue);
          updateVideoVoiceLevels(existing, cue);
          continue;
        }

        if (cue.assetPath) {
          await resolveAssetBlob(cue.assetPath);
        }
        if (generation !== this.syncGeneration) return;

        const voice = startVideoVoice(
          cue,
          ctx,
          goAtMs,
          (id) => {
            if (this.videoVoices.get(id) === voice) {
              this.stopVideoVoice(id);
              this.handleVoiceEnded(id);
            }
          },
          (panner) => this.connectVoicePanner(panner, cue),
        );

        if (!voice) {
          console.warn(`[audio] Missing video asset in VFS: ${cue.assetPath}`);
          continue;
        }

        if (generation !== this.syncGeneration) {
          stopVideoVoice(voice);
          return;
        }

        this.videoVoices.set(cueId, voice);
        this.notifyVideoVoiceListeners();
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
            this.rerouteVoiceIfNeeded(existing, cue);
            this.updateVoiceLevels(cueId, cue);
            continue;
          }
          this.stopVoice(cueId);
        }

        const streamed = this.streamedAudioVoices.get(cueId);
        if (streamed) {
          if (streamed.goAtMs === goAtMs) {
            this.rerouteVideoVoiceIfNeeded(streamed, cue);
            updateVideoVoiceLevels(streamed, cue);
            continue;
          }
          // Re-fired: restart, from the decoded buffer when it is ready by now.
          this.stopStreamedAudioVoice(cueId);
        }

        const buffer = getCachedAudioBuffer(assetPath);
        if (buffer) {
          try {
            this.startVoice(cue, buffer, ctx, goAtMs);
          } catch (err) {
            console.warn(`[audio] Could not play ${assetPath}`, err);
          }
          continue;
        }

        // Decoding a long file takes seconds; stream it now and decode for the next GO.
        const blob = await resolveAssetBlob(assetPath);
        if (generation !== this.syncGeneration) return;
        if (!blob) {
          console.warn(`[audio] Missing asset in VFS: ${assetPath}`);
          continue;
        }
        preloadAudioBuffer(assetPath);

        const voice = startVideoVoice(
          cue,
          ctx,
          goAtMs,
          (id) => {
            if (this.streamedAudioVoices.get(id) === voice) {
              this.stopStreamedAudioVoice(id);
              this.handleVoiceEnded(id);
            }
          },
          (panner) => this.connectVoicePanner(panner, cue),
        );
        if (!voice) {
          console.warn(`[audio] Missing asset in VFS: ${assetPath}`);
          continue;
        }
        this.streamedAudioVoices.set(cueId, voice);
      }

      for (const cueId of targetLiveAudio) {
        const cue = cueById.get(cueId);
        if (generation !== this.syncGeneration) return;
        if (cue) await this.startLiveAudioVoice(cue, ctx, generation);
      }

      if (generation !== this.syncGeneration) return;
      this.updateActiveVoiceLevels(cues);

      const missingAudio =
        targetAudio.size > 0 &&
        [...targetAudio].every((id) => !this.voices.has(id) && !this.streamedAudioVoices.has(id));
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
    for (const id of [...this.streamedAudioVoices.keys()]) {
      this.stopStreamedAudioVoice(id);
    }
    for (const id of [...this.liveAudioVoices.keys()]) {
      this.stopLiveAudioVoice(id);
    }
  }
}

export const audioEngine = new AudioEngine();
