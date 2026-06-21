import { invoke } from "@tauri-apps/api/core";
import { appCacheDir, join } from "@tauri-apps/api/path";
import { writeFile } from "@tauri-apps/plugin-fs";

let configuredDevice: string | null = null;
let configuredSampleRate = 48_000;

export async function stopNativeAudioOutput(): Promise<void> {
  configuredDevice = null;
  await invoke("stop_native_playback");
}

export async function setNativeAudioOutputDevice(
  deviceName: string | null,
  sampleRate?: number,
): Promise<number> {
  if (!deviceName) {
    await stopNativeAudioOutput();
    configuredSampleRate = sampleRate ?? 48_000;
    return configuredSampleRate;
  }

  if (configuredDevice !== deviceName) {
    await invoke("stop_native_playback");
    configuredSampleRate = await invoke<number>("set_audio_output_device", {
      deviceName,
      sampleRate,
    });
    configuredDevice = deviceName;
    console.log(
      `[audio] Native output device configured: ${deviceName} @ ${configuredSampleRate} Hz`,
    );
    return configuredSampleRate;
  }

  if (sampleRate && sampleRate !== configuredSampleRate) {
    configuredSampleRate = await invoke<number>("set_audio_output_device", {
      deviceName,
      sampleRate,
    });
  }
  return configuredSampleRate;
}

function stereoGains(volume: number, pan: number): { left: number; right: number } {
  const clamped = Math.max(-1, Math.min(1, pan));
  const t = (clamped + 1) / 2;
  return {
    left: volume * Math.cos((t * Math.PI) / 2),
    right: volume * Math.sin((t * Math.PI) / 2),
  };
}

async function resampleBuffer(buffer: AudioBuffer, targetRate: number): Promise<AudioBuffer> {
  if (buffer.sampleRate === targetRate) return buffer;
  const frameCount = Math.max(1, Math.ceil(buffer.duration * targetRate));
  const offline = new OfflineAudioContext(buffer.numberOfChannels, frameCount, targetRate);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(0);
  return offline.startRendering();
}

export function extractInterleavedPcm(
  buffer: AudioBuffer,
  volume: number,
  pan: number,
  startSec: number,
  durationSec: number,
): Float32Array {
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  const startFrame = Math.max(0, Math.floor(startSec * buffer.sampleRate));
  const frameCount = Math.max(
    0,
    Math.min(Math.ceil(durationSec * buffer.sampleRate), left.length - startFrame),
  );
  const { left: gainL, right: gainR } = stereoGains(volume, pan);
  const interleaved = new Float32Array(frameCount * 2);

  for (let index = 0; index < frameCount; index++) {
    const sampleIndex = startFrame + index;
    interleaved[index * 2] = (left[sampleIndex] ?? 0) * gainL;
    interleaved[index * 2 + 1] = (right[sampleIndex] ?? 0) * gainR;
  }

  return interleaved;
}

/** Preload cue audio into the native buffer, then start cpal playback. */
export async function streamBufferToNative(
  buffer: AudioBuffer,
  volume: number,
  pan: number,
  startSec: number,
  durationSec: number,
  deviceName: string,
): Promise<void> {
  if (configuredDevice !== deviceName) {
    console.warn(
      `[audio] Skipping stale native playback for "${deviceName}" (active device is "${configuredDevice ?? "none"}")`,
    );
    return;
  }

  const resolvedRate = configuredSampleRate;
  const playbackBuffer =
    resolvedRate === buffer.sampleRate ? buffer : await resampleBuffer(buffer, resolvedRate);

  await invoke("reset_native_playback_buffer");

  const interleaved = extractInterleavedPcm(playbackBuffer, volume, pan, startSec, durationSec);
  const frameCount = interleaved.length / 2;
  const seconds = frameCount / playbackBuffer.sampleRate;
  console.log(
    `[audio] Native preload: ${seconds.toFixed(2)}s (${frameCount} frames @ ${playbackBuffer.sampleRate} Hz)`,
  );

  const bytes = new Uint8Array(interleaved.buffer, interleaved.byteOffset, interleaved.byteLength);
  const cacheDir = await appCacheDir();
  const path = await join(cacheDir, `native-playback-${Date.now()}.pcm`);
  await writeFile(path, bytes);

  const sampleCount = await invoke<number>("load_native_playback_pcm_file", { path });
  const expectedSamples = interleaved.length;
  if (sampleCount !== expectedSamples) {
    console.warn(
      `[audio] Native PCM load incomplete: got ${sampleCount} samples, expected ${expectedSamples}`,
    );
  }

  if (configuredDevice !== deviceName) {
    console.warn(`[audio] Device changed during preload — skipping start_native_playback`);
    return;
  }

  await invoke("start_native_playback");
}

export function queueNativeAudioPcm(_interleavedStereo: Float32Array): void {
  // Video capture fallback; audio cues use streamBufferToNative.
}

export function startNativeAudioPcmFlushLoop(): void {}

export function stopNativeAudioPcmFlushLoop(): void {}

export async function initNativeAudioOutput(): Promise<void> {}
