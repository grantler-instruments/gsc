import { getPlatform } from "./index";

export async function initNativeAudioOutput(): Promise<void> {
  // No-op; device listing uses cpal directly on desktop.
}

export async function stopNativeAudioOutput(): Promise<void> {
  if (getPlatform() !== "tauri") return;
  const { stopNativeAudioOutput: stop } = await import("./native-audio-output.tauri");
  await stop();
}

export async function setNativeAudioOutputDevice(
  deviceName: string | null,
  sampleRate?: number,
): Promise<number> {
  if (getPlatform() !== "tauri") return sampleRate ?? 48_000;
  const { setNativeAudioOutputDevice: set } = await import("./native-audio-output.tauri");
  return set(deviceName, sampleRate);
}

export function queueNativeAudioPcm(_interleavedStereo: Float32Array): void {}

export function startNativeAudioPcmFlushLoop(): void {}

export function stopNativeAudioPcmFlushLoop(): void {}

export async function streamBufferToNative(
  buffer: AudioBuffer,
  volume: number,
  pan: number,
  startSec: number,
  durationSec: number,
  deviceName: string,
): Promise<void> {
  if (getPlatform() !== "tauri") return;
  const { streamBufferToNative: stream } = await import("./native-audio-output.tauri");
  await stream(buffer, volume, pan, startSec, durationSec, deviceName);
}
