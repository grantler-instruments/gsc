import { getDecodeAudioContext, loadAudioBuffer } from "../audio/buffer-cache";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { vfsHas } from "../vfs/engine";
import { assetKindFromPath } from "../vfs/import";

const cache = new Map<string, number>();
/** In-flight probes, shared so concurrent callers wait for the same result. */
const pending = new Map<string, Promise<number | undefined>>();

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

async function probeMediaDurationSec(assetPath: string): Promise<number | undefined> {
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
  }
}

/** Decode or read metadata so duration is available for UI and sequencing. */
export function ensureMediaDurationSec(assetPath: string): Promise<number | undefined> {
  const cached = getMediaDurationSec(assetPath);
  if (cached !== undefined) return Promise.resolve(cached);
  let probe = pending.get(assetPath);
  if (!probe) {
    probe = probeMediaDurationSec(assetPath).finally(() => {
      if (pending.get(assetPath) === probe) pending.delete(assetPath);
    });
    pending.set(assetPath, probe);
  }
  return probe;
}

export function prefetchMediaDurations(assetPaths: string[]): void {
  for (const path of assetPaths) {
    if (getMediaDurationSec(path) !== undefined) continue;
    void ensureMediaDurationSec(path);
  }
}
