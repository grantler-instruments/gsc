import { createFile, type Movie } from "mp4box";
import { getDecodeAudioContext, loadAudioBuffer } from "../audio/buffer-cache";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { setMediaDurationSec } from "./media-duration";

export interface AssetTechnicalMetadata {
  durationSec?: number;
  width?: number;
  height?: number;
  codec?: string;
  frameRate?: number;
  bitRate?: number;
  sampleRate?: number;
  channels?: number;
}

const cache = new Map<string, AssetTechnicalMetadata>();
const pending = new Map<string, Promise<AssetTechnicalMetadata>>();

function isMp4Container(path: string): boolean {
  return /\.(m4a|m4v|mov|mp4)$/i.test(path);
}

function readMp4Metadata(blob: Blob): Promise<AssetTechnicalMetadata> {
  return new Promise((resolve) => {
    const file = createFile();
    file.onError = () => resolve({});
    file.onReady = (info: Movie) => {
      const videoTrack = info.tracks.find((track) => track.video);
      const audioTrack = info.tracks.find((track) => track.audio);
      const videoDurationSec =
        videoTrack && videoTrack.timescale > 0
          ? videoTrack.duration / videoTrack.timescale
          : undefined;
      resolve({
        durationSec: info.timescale > 0 ? info.duration / info.timescale : undefined,
        width: videoTrack?.video?.width,
        height: videoTrack?.video?.height,
        codec: videoTrack?.codec ?? audioTrack?.codec,
        frameRate:
          videoTrack && videoDurationSec && videoTrack.nb_samples > 0
            ? videoTrack.nb_samples / videoDurationSec
            : undefined,
        bitRate: videoTrack?.bitrate ?? audioTrack?.bitrate,
        sampleRate: audioTrack?.audio?.sample_rate,
        channels: audioTrack?.audio?.channel_count,
      });
    };

    void blob.arrayBuffer().then((buffer) => {
      const mp4Buffer = buffer as ArrayBuffer & { fileStart: number };
      mp4Buffer.fileStart = 0;
      file.appendBuffer(mp4Buffer);
      file.flush();
    });
  });
}

function readVideoMetadata(blob: Blob): Promise<AssetTechnicalMetadata> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        durationSec: Number.isFinite(video.duration) ? video.duration : undefined,
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

function readImageMetadata(blob: Blob): Promise<AssetTechnicalMetadata> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

async function readAudioMetadata(assetPath: string): Promise<AssetTechnicalMetadata> {
  try {
    const buffer = await loadAudioBuffer(assetPath, getDecodeAudioContext());
    return buffer
      ? {
          durationSec: buffer.duration,
          sampleRate: buffer.sampleRate,
          channels: buffer.numberOfChannels,
        }
      : {};
  } catch {
    return {};
  }
}

export function getAssetTechnicalMetadata(assetPath: string): AssetTechnicalMetadata | undefined {
  return cache.get(assetPath);
}

export function clearAssetTechnicalMetadata(assetPath: string): void {
  cache.delete(assetPath);
  pending.delete(assetPath);
}

/** Read technical media properties supported by the browser and MP4 container parser. */
export async function ensureAssetTechnicalMetadata(
  assetPath: string,
  kind: "audio" | "video" | "image",
): Promise<AssetTechnicalMetadata> {
  const cached = cache.get(assetPath);
  if (cached) return cached;
  const existing = pending.get(assetPath);
  if (existing) return existing;

  const probe = (async () => {
    const blob = await resolveAssetBlob(assetPath);
    if (!blob) return {};

    const metadata =
      kind === "audio"
        ? await readAudioMetadata(assetPath)
        : kind === "image"
          ? await readImageMetadata(blob)
          : await readVideoMetadata(blob);
    const mp4Metadata = isMp4Container(assetPath) ? await readMp4Metadata(blob) : {};
    const result = { ...metadata, ...mp4Metadata };
    if (result.durationSec) setMediaDurationSec(assetPath, result.durationSec);
    cache.set(assetPath, result);
    return result;
  })()
    .catch(() => ({}))
    .finally(() => pending.delete(assetPath));

  pending.set(assetPath, probe);
  return probe;
}
