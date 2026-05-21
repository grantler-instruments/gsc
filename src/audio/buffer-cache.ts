import { setMediaDurationSec } from "../lib/media-duration";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { vfsGet } from "../vfs/engine";

const buffers = new Map<string, AudioBuffer>();
let decodeCtx: AudioContext | null = null;

/** Shared context for decode / waveform probes (not for playback output). */
export function getDecodeAudioContext(): AudioContext {
  if (!decodeCtx) {
    decodeCtx = new AudioContext();
  }
  return decodeCtx;
}

export function getCachedAudioBuffer(assetPath: string): AudioBuffer | undefined {
  return buffers.get(assetPath);
}

export async function loadAudioBuffer(
  assetPath: string,
  ctx: AudioContext = getDecodeAudioContext(),
): Promise<AudioBuffer | null> {
  const cached = buffers.get(assetPath);
  if (cached) return cached;

  const blob = (await resolveAssetBlob(assetPath)) ?? vfsGet(assetPath);
  if (!blob) return null;

  const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
  buffers.set(assetPath, buffer);
  setMediaDurationSec(assetPath, buffer.duration);
  return buffer;
}

export function clearCachedAudioBuffer(assetPath: string): void {
  buffers.delete(assetPath);
}
