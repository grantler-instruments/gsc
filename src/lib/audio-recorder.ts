import { sanitizeShowName } from "./project-paths";
import { encodeWavMono, hasAudibleSamples, mergeFloat32Chunks } from "./wav-encode";

export function recordingFilenameForCue(cueName: string): string {
  const base = sanitizeShowName(cueName) || "Recording";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${base}_${stamp}.wav`;
}

export type AudioRecorderState = "idle" | "recording" | "stopped";

export type AudioRecorderStopReason = "no_samples" | "silent";

export class AudioRecorderStopError extends Error {
  readonly reason: AudioRecorderStopReason;

  constructor(reason: AudioRecorderStopReason) {
    super(reason);
    this.name = "AudioRecorderStopError";
    this.reason = reason;
  }
}

export interface AudioRecorderStartOptions {
  deviceId?: string;
  /** When provided, getUserMedia is skipped and tracks are not stopped on dispose. */
  stream?: MediaStream;
}

const RECORDER_WORKLET_CODE = `
class GscRecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch0 = input[0];
    if (!ch0 || ch0.length === 0) return true;
    const ch1 = input.length > 1 ? input[1] : null;
    const out = new Float32Array(ch0.length);
    for (let i = 0; i < ch0.length; i++) {
      out[i] = ch1 ? (ch0[i] + ch1[i]) * 0.5 : ch0[i];
    }
    this.port.postMessage(out);
    return true;
  }
}
registerProcessor("gsc-recorder", GscRecorderProcessor);
`;

function mixInputBufferToMono(inputBuffer: AudioBuffer): Float32Array {
  const ch0 = inputBuffer.getChannelData(0);
  if (inputBuffer.numberOfChannels === 1) {
    return new Float32Array(ch0);
  }
  const ch1 = inputBuffer.getChannelData(1);
  const mixed = new Float32Array(ch0.length);
  for (let i = 0; i < ch0.length; i++) {
    mixed[i] = (ch0[i] + ch1[i]) * 0.5;
  }
  return mixed;
}

function pushChunk(chunks: Float32Array[], data: unknown): void {
  if (data instanceof Float32Array) {
    chunks.push(new Float32Array(data));
    return;
  }
  if (data instanceof ArrayBuffer) {
    chunks.push(new Float32Array(data));
  }
}

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private ownsStream = true;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private muteGain: GainNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private workletModuleUrl: string | null = null;
  private chunks: Float32Array[] = [];
  private _state: AudioRecorderState = "idle";
  private sampleRate = 44100;

  get state(): AudioRecorderState {
    return this._state;
  }

  async start(options?: AudioRecorderStartOptions): Promise<void> {
    if (this._state === "recording") return;
    this.disposeGraph();

    if (options?.stream) {
      this.stream = options.stream;
      this.ownsStream = false;
    } else {
      const constraints: MediaStreamConstraints = {
        audio: options?.deviceId ? { deviceId: { ideal: options.deviceId } } : true,
      };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.ownsStream = true;
    }

    this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    this.sampleRate = this.ctx.sampleRate;

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.muteGain = this.ctx.createGain();
    this.muteGain.gain.value = 0;

    this.chunks = [];
    this._state = "recording";

    // Level meter reads from source in parallel — not from the capture chain.
    this.source.connect(this.analyser);

    try {
      await this.startWorkletCapture();
    } catch (err) {
      console.warn("[record] AudioWorklet unavailable, falling back to ScriptProcessor", err);
      this.startScriptProcessorCapture();
    }

    this.muteGain.connect(this.ctx.destination);
  }

  async stop(): Promise<Blob> {
    if (this._state !== "recording") {
      throw new Error("Not recording");
    }
    this._state = "stopped";

    const samples = mergeFloat32Chunks(this.chunks);
    this.chunks = [];
    this.disposeGraph();

    if (samples.length === 0) {
      throw new AudioRecorderStopError("no_samples");
    }
    if (!hasAudibleSamples(samples)) {
      throw new AudioRecorderStopError("silent");
    }

    return encodeWavMono(samples, this.sampleRate);
  }

  /** RMS level 0–1 for a level meter (scaled for typical speech levels). */
  getLevel(): number {
    if (!this.analyser || this._state !== "recording") return 0;

    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(1, rms * 12);
  }

  dispose(): void {
    this._state = "idle";
    this.chunks = [];
    this.disposeGraph();
  }

  private async startWorkletCapture(): Promise<void> {
    if (!this.ctx || !this.source || !this.muteGain) {
      throw new Error("Audio graph not initialized");
    }

    this.workletModuleUrl = URL.createObjectURL(
      new Blob([RECORDER_WORKLET_CODE], { type: "application/javascript" }),
    );
    await this.ctx.audioWorklet.addModule(this.workletModuleUrl);

    this.worklet = new AudioWorkletNode(this.ctx, "gsc-recorder", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 2,
    });
    this.worklet.port.onmessage = (event: MessageEvent) => {
      if (this._state !== "recording") return;
      pushChunk(this.chunks, event.data);
    };

    this.source.connect(this.worklet);
    this.worklet.connect(this.muteGain);
  }

  private startScriptProcessorCapture(): void {
    if (!this.ctx || !this.source || !this.muteGain) {
      throw new Error("Audio graph not initialized");
    }

    const inputChannels = Math.max(1, Math.min(this.source.channelCount || 2, 2));
    this.scriptProcessor = this.ctx.createScriptProcessor(4096, inputChannels, 1);
    this.scriptProcessor.onaudioprocess = (event) => {
      if (this._state !== "recording") return;
      this.chunks.push(mixInputBufferToMono(event.inputBuffer));
    };

    this.source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.muteGain);
  }

  private disposeGraph(): void {
    this.worklet?.disconnect();
    this.scriptProcessor?.disconnect();
    this.analyser?.disconnect();
    this.source?.disconnect();
    this.muteGain?.disconnect();
    this.worklet = null;
    this.scriptProcessor = null;
    this.analyser = null;
    this.source = null;
    this.muteGain = null;

    if (this.workletModuleUrl) {
      URL.revokeObjectURL(this.workletModuleUrl);
      this.workletModuleUrl = null;
    }

    if (this.stream && this.ownsStream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
    }
    this.stream = null;
    this.ownsStream = true;

    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
