import { getDecodeAudioContext, loadAudioBuffer } from "../audio/buffer-cache";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { vfsHas } from "../vfs/engine";
import { assetKindFromPath } from "../vfs/import";

const cache = new Map<string, number>();
const pending = new Set<string>();

export function getMediaDurationSec(assetPath: string): number | undefined {
  const d = cache.get(assetPath);
  return d !== undefined && Number.isFinite(d) && d > 0 ? d : undefined;
}

export function setMediaDurationSec(assetPath: string, durationSec: number): void {
  if (Number.isFinite(durationSec) && durationSec > 0) {
    cache.set(assetPath, durationSec);
  }
}

export function clearMediaDuration(assetPath: string): void {
  cache.delete(assetPath);
  pending.delete(assetPath);
}

async function probeAudioDurationSec(assetPath: string): Promise<number | undefined> {
  if (!vfsHas(assetPath)) return undefined;
  const buffer = await loadAudioBuffer(assetPath, getDecodeAudioContext());
  return buffer?.duration;
}

async function probeVideoDurationSec(assetPath: string): Promise<number | undefined> {
  const blob = await resolveAssetBlob(assetPath);
  if (!blob) return undefined;

  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<number | undefined>((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const d = video.duration;
        resolve(Number.isFinite(d) && d > 0 ? d : undefined);
      };
      video.onerror = () => resolve(undefined);
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decode or read metadata so duration is available for UI and sequencing. */
export async function ensureMediaDurationSec(assetPath: string): Promise<number | undefined> {
  const cached = getMediaDurationSec(assetPath);
  if (cached !== undefined) return cached;
  if (pending.has(assetPath)) return undefined;

  pending.add(assetPath);
  try {
    const kind = assetKindFromPath(assetPath);
    const duration =
      kind === "video"
        ? await probeVideoDurationSec(assetPath)
        : kind === "audio"
          ? await probeAudioDurationSec(assetPath)
          : undefined;

    if (duration !== undefined) {
      setMediaDurationSec(assetPath, duration);
    }
    return duration;
  } catch (err) {
    console.warn(`[media] Could not read duration for ${assetPath}`, err);
    return undefined;
  } finally {
    pending.delete(assetPath);
  }
}

export function prefetchMediaDurations(assetPaths: string[]): void {
  for (const path of assetPaths) {
    if (getMediaDurationSec(path) !== undefined) continue;
    void ensureMediaDurationSec(path);
  }
}
