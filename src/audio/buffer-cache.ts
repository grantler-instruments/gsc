import { setMediaDurationSec } from "../lib/media-duration";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { trackAssetLoading } from "../stores/asset-loading";
import { vfsGet } from "../vfs/engine";

interface CacheEntry {
  buffer: AudioBuffer;
  /** Decoded PCM size (Float32 per sample per channel). */
  bytes: number;
  lastUsedMs: number;
}

export interface AudioCacheEntryInfo {
  path: string;
  bytes: number;
  lastUsedMs: number;
}

const buffers = new Map<string, CacheEntry>();
const decodeListeners = new Set<() => void>();
export function subscribeAudioDecodes(listener: () => void): () => void {
  decodeListeners.add(listener);
  return () => {
    decodeListeners.delete(listener);
  };
}
/** In-flight decodes so concurrent loads of one path decode once. */
const decoding = new Map<string, Promise<AudioBuffer | null>>();
let decodeCtx: AudioContext | null = null;
/** Shared context for decode / waveform probes (not for playback output). */
export function getDecodeAudioContext(): AudioContext {
  if (!decodeCtx) {
    decodeCtx = new AudioContext();
  }
  return decodeCtx;
}

export function audioBufferBytes(buffer: AudioBuffer): number {
  return buffer.length * buffer.numberOfChannels * 4;
}

export function getCachedAudioBuffer(assetPath: string): AudioBuffer | undefined {
  const entry = buffers.get(assetPath);
  if (!entry) return undefined;
  entry.lastUsedMs = Date.now();
  return entry.buffer;
}

async function decodeAsset(assetPath: string, ctx: AudioContext): Promise<AudioBuffer | null> {
  const blob = (await resolveAssetBlob(assetPath)) ?? vfsGet(assetPath);
  if (!blob) return null;
  return ctx.decodeAudioData(await blob.arrayBuffer());
}

export async function loadAudioBuffer(
  assetPath: string,
  ctx: AudioContext = getDecodeAudioContext(),
): Promise<AudioBuffer | null> {
  const cached = getCachedAudioBuffer(assetPath);
  if (cached) return cached;

  let pending = decoding.get(assetPath);
  if (!pending) {
    pending = decodeAsset(assetPath, ctx)
      .then((buffer) => {
        if (buffer && decoding.get(assetPath) === pending) {
          buffers.set(assetPath, {
            buffer,
            bytes: audioBufferBytes(buffer),
            lastUsedMs: Date.now(),
          });
          setMediaDurationSec(assetPath, buffer.duration);
          for (const listener of decodeListeners) listener();
        }
        return buffer;
      })
      .finally(() => {
        if (decoding.get(assetPath) === pending) decoding.delete(assetPath);
      });
    decoding.set(assetPath, pending);
    void trackAssetLoading(assetPath, pending).catch(() => {});
  }
  return pending;
}

/** Warm the cache without awaiting; errors are logged, not thrown. */
export function preloadAudioBuffer(assetPath: string): void {
  if (buffers.has(assetPath) || decoding.has(assetPath)) return;
  loadAudioBuffer(assetPath).catch((err) => {
    console.warn(`[audio] Preload failed for ${assetPath}`, err);
  });
}

export function isAudioBufferCached(assetPath: string): boolean {
  return buffers.has(assetPath);
}

export function getAudioCacheBytes(): number {
  let total = 0;
  for (const entry of buffers.values()) total += entry.bytes;
  return total;
}

export function listAudioCacheEntries(): AudioCacheEntryInfo[] {
  return [...buffers].map(([path, entry]) => ({
    path,
    bytes: entry.bytes,
    lastUsedMs: entry.lastUsedMs,
  }));
}

/** Drop a decoded buffer. Returns freed bytes (0 when not cached). */
export function evictAudioBuffer(assetPath: string): number {
  const entry = buffers.get(assetPath);
  if (!entry) return 0;
  buffers.delete(assetPath);
  return entry.bytes;
}

export function clearCachedAudioBuffer(assetPath: string): void {
  buffers.delete(assetPath);
  // Drop any in-flight decode so a stale result is not cached after replace.
  decoding.delete(assetPath);
}
