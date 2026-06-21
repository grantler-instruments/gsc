import { resolveCueAudioBusId } from "../lib/audio-buses";
import { canRouteAudioOutputDevice, resolveMediaSinkId } from "../lib/audio-output";
import { getLoopPlayCount } from "../lib/loop";
import { getMediaDurationSec } from "../lib/media-duration";
import { notifyErrorFromUnknown, notifyWarning } from "../lib/notifications";
import { videoTargetTime } from "../lib/video-playback";
import { initDesktopAudioOutput, shouldRouteViaNativeCpal } from "../platform/audio-capabilities";
import { getPlatform } from "../platform/index";
import {
  initNativeAudioOutput,
  queueNativeAudioPcm,
  setNativeAudioOutputDevice,
  stopNativeAudioOutput,
  stopNativeAudioPcmFlushLoop,
  streamBufferToNative,
} from "../platform/native-audio-output";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { resolveEffectivePan, resolveEffectiveVolume } from "../stores/fade";
import type { AudioBus } from "../types/audio-bus";
import type { Cue } from "../types/cue";
import { getCachedAudioBuffer, loadAudioBuffer } from "./buffer-cache";
import { MixerGraph } from "./mixer";
import { createCpalCaptureNode, disposeCpalCaptureNode } from "./native-output-bridge";
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

interface NativeVoice {
  goAtMs: number;
  endedTimer: ReturnType<typeof setTimeout> | null;
  loading?: boolean;
}

type VoiceEndedHandler = (cueId: string) => void;

/**
 * Browser playback via Web Audio API (reliable in Chrome/Brave).
 * Video cues use MediaElementSource; audio cues use decoded buffers.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private mixer: MixerGraph | null = null;
  private audioBuses: AudioBus[] = [];
  private masterVolume = 1;
  private voices = new Map<string, ActiveVoice>();
  private nativeVoices = new Map<string, NativeVoice>();
  private videoVoices = new Map<string, VideoVoice>();
  private syncGeneration = 0;
  private onVoiceEndedHandler: VoiceEndedHandler | null = null;
  private requestedOutputDevice: string | null = null;
  /** Resolved sink id; undefined until first resolve. Empty string = system default. */
  private resolvedSinkId: string | undefined;
  private cpalCaptureNode: AudioNode | null = null;
  private nativeSilentOutput: GainNode | null = null;
  private nativePlaybackTail: Promise<void> = Promise.resolve();
  private nativePlaybackGeneration = 0;
  /** Last device fully applied via setOutputDevice (not prepareOutputDevice). */
  private appliedOutputDevice: string | null | undefined;
  private outputDeviceReady: Promise<void> = Promise.resolve();

  /** Load desktop audio capabilities (default output device name). */
  async initDesktopOutput(): Promise<void> {
    await initDesktopAudioOutput();
    await initNativeAudioOutput();
  }

  onVoiceEnded(handler: VoiceEndedHandler | null): void {
    this.onVoiceEndedHandler = handler;
  }

  /** Set the intended output device before AudioContext creation. */
  prepareOutputDevice(deviceId: string | null): void {
    this.requestedOutputDevice = deviceId;
    this.resolvedSinkId = undefined;
  }

  private usesNativeCpalOutput(): boolean {
    return shouldRouteViaNativeCpal(this.requestedOutputDevice);
  }

  /** Keep Web Audio off Mac speakers when cpal owns output (audio-only cues). */
  private ensureNativeWebAudioMuted(): void {
    if (!this.ctx || !this.mixer || !this.usesNativeCpalOutput()) return;
    if (!this.nativeSilentOutput) {
      this.nativeSilentOutput = this.ctx.createGain();
      this.nativeSilentOutput.gain.value = 0;
    }
    if (!this.cpalCaptureNode) {
      this.mixer.setOutputDestination(this.nativeSilentOutput);
    }
  }

  private async syncWebAudioRunningState(hasActiveVideo: boolean): Promise<void> {
    if (!this.ctx) return;
    const needsWebAudio = !this.usesNativeCpalOutput() || hasActiveVideo;

    if (this.usesNativeCpalOutput()) {
      if (hasActiveVideo) {
        await this.attachNativeBridge();
      } else {
        this.teardownNativeBridge(false);
        this.ensureNativeWebAudioMuted();
      }
    }

    if (needsWebAudio) {
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
    } else if (this.ctx.state === "running") {
      await this.ctx.suspend();
    }
  }

  private teardownNativeBridge(reconnectToDefault = true): void {
    stopNativeAudioPcmFlushLoop();
    if (this.cpalCaptureNode) {
      disposeCpalCaptureNode(this.cpalCaptureNode);
      this.cpalCaptureNode = null;
    }
    if (reconnectToDefault && this.mixer && this.ctx) {
      this.mixer.setOutputDestination(this.ctx.destination);
    }
  }

  private async createNativeCaptureNode(): Promise<AudioNode> {
    if (!this.ctx) {
      throw new Error("AudioContext must exist before creating native capture");
    }
    if (this.cpalCaptureNode) return this.cpalCaptureNode;

    this.cpalCaptureNode = await createCpalCaptureNode(this.ctx, queueNativeAudioPcm);
    return this.cpalCaptureNode;
  }

  private async attachNativeBridge(): Promise<void> {
    if (!this.mixer || !this.usesNativeCpalOutput()) return;
    const capture = await this.createNativeCaptureNode();
    this.mixer.setOutputDestination(capture);
  }

  /** Route playback to a specific output device (cpal name, browser id, or label). */
  async setOutputDevice(deviceId: string | null): Promise<void> {
    if (this.appliedOutputDevice === deviceId) {
      return;
    }

    const change = this.applyOutputDevice(deviceId);
    this.outputDeviceReady = change;
    await change;
  }

  private async applyOutputDevice(deviceId: string | null): Promise<void> {
    this.nativePlaybackGeneration++;
    const priorNativePlayback = this.nativePlaybackTail;
    this.requestedOutputDevice = deviceId;
    this.resolvedSinkId = undefined;

    await this.stopAll();
    await priorNativePlayback.catch(() => undefined);
    await stopNativeAudioOutput();
    await this.rebuildContext();

    if (shouldRouteViaNativeCpal(deviceId)) {
      try {
        await setNativeAudioOutputDevice(deviceId, this.ctx?.sampleRate);
        this.ensureNativeWebAudioMuted();
        console.log(`[audio] Output routing: native cpal → ${deviceId}`);
      } catch (err) {
        console.error(`[audio] Could not open native output device "${deviceId}"`, err);
        notifyErrorFromUnknown(err);
        throw err;
      }
      this.appliedOutputDevice = deviceId;
      await this.syncWebAudioRunningState(this.videoVoices.size > 0);
      return;
    }

    const nextSinkId = await resolveMediaSinkId(deviceId);
    this.resolvedSinkId = nextSinkId;

    if (deviceId && !canRouteAudioOutputDevice() && getPlatform() !== "tauri") {
      notifyWarning("Audio output device selection is not supported in this runtime.");
    }

    if (deviceId && canRouteAudioOutputDevice() && !nextSinkId) {
      console.warn(
        `[audio] Could not resolve output device "${deviceId}" — re-select it in Settings.`,
      );
      notifyWarning(
        `Could not resolve output device "${deviceId}". Re-select it in Settings → Audio.`,
      );
    }

    if (this.ctx && canRouteAudioOutputDevice() && nextSinkId) {
      try {
        await this.ctx.setSinkId(nextSinkId);
      } catch (err) {
        console.warn("[audio] setSinkId failed, recreating AudioContext", err);
        await this.rebuildContext();
      }
    }

    this.appliedOutputDevice = deviceId;
    console.log(
      `[audio] Output routing: Web Audio${deviceId ? ` (requested ${deviceId})` : " (system default)"}`,
    );
    await this.syncWebAudioRunningState(this.videoVoices.size > 0);
  }

  private async resolveSinkId(): Promise<string> {
    if (this.resolvedSinkId !== undefined) return this.resolvedSinkId;
    this.resolvedSinkId = await resolveMediaSinkId(this.requestedOutputDevice);
    return this.resolvedSinkId;
  }

  private async rebuildContext(): Promise<void> {
    const buses = this.audioBuses;
    const volume = this.masterVolume;
    await this.stopAll();
    this.mixer?.dispose();
    this.nativeSilentOutput = null;
    await this.ctx?.close();
    this.ctx = null;
    this.mixer = null;
    await this.unlock();
    this.syncMixer(buses, volume);
  }

  async unlock(): Promise<AudioContext> {
    if (!this.ctx) {
      if (this.usesNativeCpalOutput()) {
        this.ctx = new AudioContext();
        this.nativeSilentOutput = this.ctx.createGain();
        this.nativeSilentOutput.gain.value = 0;
        this.mixer = new MixerGraph(this.ctx, this.nativeSilentOutput);
      } else {
        const sinkId = await this.resolveSinkId();
        this.ctx =
          sinkId && canRouteAudioOutputDevice() ? new AudioContext({ sinkId }) : new AudioContext();
        this.mixer = new MixerGraph(this.ctx);
      }
      this.mixer.sync(this.audioBuses);
      this.mixer.setMasterVolume(this.masterVolume);
    }
    await this.syncWebAudioRunningState(this.videoVoices.size > 0);
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
    return busId;
  }

  private stopVoice(cueId: string): void {
    this.stopNativeVoice(cueId);
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

  private stopNativeVoice(cueId: string): void {
    const voice = this.nativeVoices.get(cueId);
    if (!voice) return;
    if (voice.endedTimer) clearTimeout(voice.endedTimer);
    this.nativeVoices.delete(cueId);
  }

  private runNativePlaybackExclusive<T>(task: () => Promise<T>): Promise<T> {
    const generation = this.nativePlaybackGeneration;
    const run = this.nativePlaybackTail.then(async () => {
      if (generation !== this.nativePlaybackGeneration) {
        throw new Error("native playback cancelled");
      }
      return task();
    });
    this.nativePlaybackTail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async startNativeVoice(cue: Cue, buffer: AudioBuffer, goAtMs: number): Promise<void> {
    this.stopNativeVoice(cue.id);
    this.nativeVoices.set(cue.id, { goAtMs, endedTimer: null, loading: true });

    const { offsetSec, durationSec } = playbackWindow(cue, buffer.duration);
    const volume = clamp01(resolveEffectiveVolume(cue.id, cue.volume ?? 1));
    const pan = clampPan(resolveEffectivePan(cue.id, cue.pan ?? 0));

    try {
      await this.runNativePlaybackExclusive(async () => {
        if (this.nativeVoices.get(cue.id)?.goAtMs !== goAtMs) return;

        const startOffset = videoTargetTime(cue, buffer.duration, goAtMs);
        const inSlice = Math.max(0, startOffset - offsetSec);
        const remainingInSlice = Math.max(0.01, durationSec - inSlice);
        const pushStartedMs = Date.now();

        await streamBufferToNative(
          buffer,
          volume,
          pan,
          startOffset,
          remainingInSlice,
          this.requestedOutputDevice ?? "",
        );

        if (this.nativeVoices.get(cue.id)?.goAtMs !== goAtMs) return;

        const pushElapsedMs = Date.now() - pushStartedMs;
        const endedTimer = setTimeout(
          () => {
            if (this.nativeVoices.get(cue.id)?.goAtMs === goAtMs) {
              this.nativeVoices.delete(cue.id);
              this.handleVoiceEnded(cue.id);
            }
          },
          Math.max(0, remainingInSlice * 1000 - pushElapsedMs),
        );

        this.nativeVoices.set(cue.id, { goAtMs, endedTimer });
      });
    } catch (err) {
      if (this.nativeVoices.get(cue.id)?.goAtMs === goAtMs) {
        this.nativeVoices.delete(cue.id);
      }
      if (err instanceof Error && err.message === "native playback cancelled") {
        return;
      }
      throw err;
    }
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
        this.voices.delete(cue.id);
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

  /** Refresh gain and pan for all active voices (e.g. during a fade). */
  updateActiveVoiceLevels(cues: Cue[]): void {
    for (const cueId of this.voices.keys()) {
      const cue = cues.find((c) => c.id === cueId);
      if (cue) {
        this.updateVoiceLevels(cueId, cue);
      }
    }
    for (const voice of this.videoVoices.values()) {
      const cue = cues.find((c) => c.id === voice.cueId);
      if (cue) {
        updateVideoVoiceLevels(voice, cue);
      }
    }
  }

  async sync(
    activeCueIds: string[],
    cues: Cue[],
    masterVolume: number,
    cueStartedAtMs: Record<string, number> = {},
    audioBuses: AudioBus[] = [],
  ): Promise<void> {
    await this.outputDeviceReady;
    const generation = ++this.syncGeneration;
    this.syncMixer(audioBuses, masterVolume);

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

      for (const id of [...this.voices.keys(), ...this.nativeVoices.keys()]) {
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
            rerouteVideoVoiceIfNeeded(existing, cue, this.audioBuses, () =>
              this.voiceDestination(cue),
            );
            updateVideoVoiceLevels(existing, cue);
            continue;
          }
          seekVideoVoice(existing, cue, goAtMs);
          rerouteVideoVoiceIfNeeded(existing, cue, this.audioBuses, () =>
            this.voiceDestination(cue),
          );
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
          this.voiceDestination(cue),
          this.audioBuses,
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
      }

      for (const cueId of targetAudio) {
        const cue = cueById.get(cueId);
        if (!cue?.assetPath) continue;
        const assetPath = cue.assetPath;
        const goAtMs = cueStartedAtMs[cueId] ?? Date.now();

        if (this.usesNativeCpalOutput()) {
          if (this.voices.has(cueId)) {
            this.stopVoice(cueId);
          }
          if (this.nativeVoices.has(cueId)) {
            const existing = this.nativeVoices.get(cueId);
            if (existing?.goAtMs === goAtMs) continue;
            this.stopVoice(cueId);
          }
        } else {
          if (this.nativeVoices.has(cueId)) {
            this.stopVoice(cueId);
          }
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
          if (this.usesNativeCpalOutput()) {
            await this.startNativeVoice(cue, buffer, goAtMs);
            if (generation !== this.syncGeneration) {
              this.stopVoice(cueId);
            }
          } else {
            this.startVoice(cue, buffer, ctx, goAtMs);
          }
        } catch (err) {
          console.warn(`[audio] Could not play ${assetPath}`, err);
        }
      }

      const missingAudio =
        targetAudio.size > 0 &&
        [...targetAudio].every((id) => !this.voices.has(id) && !this.nativeVoices.has(id));
      const missingVideo =
        targetVideo.size > 0 && [...targetVideo].every((id) => !this.videoVoices.has(id));

      if (missingAudio || missingVideo) {
        console.warn(
          "[audio] Could not start active cue(s) — re-import assets after opening a project.",
        );
      }

      await this.syncWebAudioRunningState(targetVideo.size > 0);
    } catch (err) {
      console.error("[audio] sync failed", err);
    }
  }

  getAssetDurationSec(assetPath: string): number | undefined {
    return getCachedAudioBuffer(assetPath)?.duration ?? getMediaDurationSec(assetPath);
  }

  async stopAll(): Promise<void> {
    this.syncGeneration++;
    for (const id of [...this.voices.keys(), ...this.nativeVoices.keys()]) {
      this.stopVoice(id);
    }
    for (const id of [...this.videoVoices.keys()]) {
      this.stopVideoVoice(id);
    }
  }
}

export const audioEngine = new AudioEngine();

function rerouteVideoVoiceIfNeeded(
  voice: VideoVoice,
  cue: Cue,
  audioBuses: AudioBus[],
  destination: () => AudioNode,
): void {
  const nextBusId = resolveCueAudioBusId(cue, audioBuses);
  if (voice.audioBusId === nextBusId) return;
  voice.panner.disconnect();
  voice.panner.connect(destination());
  voice.audioBusId = nextBusId;
}
