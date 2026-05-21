import { getMediaDurationSec } from "./media-duration";
import { resolveAssetBlob } from "../platform/vfs-asset";

const videoByPath = new Map<string, HTMLVideoElement>();
const urlByPath = new Map<string, string>();
const thumbCache = new Map<string, string>();
const THUMB_CACHE_MAX = 48;

function cacheKey(assetPath: string, timeSec: number): string {
  return `${assetPath}:${Math.round(timeSec * 10)}`;
}

function trimCache(): void {
  while (thumbCache.size > THUMB_CACHE_MAX) {
    const first = thumbCache.keys().next().value;
    if (first) thumbCache.delete(first);
    else break;
  }
}

async function ensureVideo(assetPath: string): Promise<HTMLVideoElement | null> {
  const existing = videoByPath.get(assetPath);
  if (existing && existing.readyState >= 2) return existing;

  const blob = await resolveAssetBlob(assetPath);
  if (!blob) return null;

  let url = urlByPath.get(assetPath);
  if (!url) {
    url = URL.createObjectURL(blob);
    urlByPath.set(assetPath, url);
  }

  const video = existing ?? document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  if (existing && existing.readyState >= 2) {
    return video;
  }

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onFail = () => {
      cleanup();
      reject(new Error("video load failed"));
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onFail);
    };
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("error", onFail);
  });

  videoByPath.set(assetPath, video);
  return video;
}

/** Capture a JPEG data URL for a frame at `timeSec` in a VFS video asset. */
export async function getVideoThumbnailDataUrl(
  assetPath: string,
  timeSec: number,
): Promise<string | null> {
  const duration = getMediaDurationSec(assetPath);
  const clamped =
    duration !== undefined
      ? Math.max(0, Math.min(timeSec, Math.max(0, duration - 0.05)))
      : Math.max(0, timeSec);

  const key = cacheKey(assetPath, clamped);
  const cached = thumbCache.get(key);
  if (cached) return cached;

  try {
    const video = await ensureVideo(assetPath);
    if (!video || !Number.isFinite(video.duration)) return null;

    const t = Math.max(0, Math.min(clamped, video.duration - 0.001));

    await new Promise<void>((resolve, reject) => {
      const onSeeked = () => {
        cleanup();
        resolve();
      };
      const onFail = () => {
        cleanup();
        reject(new Error("seek failed"));
      };
      const cleanup = () => {
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onFail);
      };
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("error", onFail);
      try {
        video.currentTime = t;
      } catch {
        cleanup();
        reject(new Error("seek failed"));
      }
    });

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw <= 0 || vh <= 0) return null;

    const thumbW = 160;
    const thumbH = Math.round(thumbW * (vh / vw));
    const canvas = document.createElement("canvas");
    canvas.width = thumbW;
    canvas.height = thumbH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, thumbW, thumbH);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    thumbCache.set(key, dataUrl);
    trimCache();
    return dataUrl;
  } catch {
    return null;
  }
}

export function clearVideoThumbnailCache(assetPath?: string): void {
  if (!assetPath) {
    for (const url of urlByPath.values()) {
      URL.revokeObjectURL(url);
    }
    videoByPath.clear();
    urlByPath.clear();
    thumbCache.clear();
    return;
  }

  const video = videoByPath.get(assetPath);
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
  videoByPath.delete(assetPath);
  const url = urlByPath.get(assetPath);
  if (url) URL.revokeObjectURL(url);
  urlByPath.delete(assetPath);

  for (const key of [...thumbCache.keys()]) {
    if (key.startsWith(`${assetPath}:`)) thumbCache.delete(key);
  }
}
