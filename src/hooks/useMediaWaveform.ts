import { useEffect, useState } from "react";
import {
  getCachedAudioBuffer,
  loadAudioBuffer,
} from "../audio/buffer-cache";
import {
  ensureMediaDurationSec,
  getMediaDurationSec,
} from "../lib/media-duration";
import { computeWaveformPeaks, WAVEFORM_PEAK_COUNT } from "../lib/waveform";
import { vfsHas } from "../vfs/engine";

export type MediaWaveformKind = "audio" | "video";

export interface MediaWaveformData {
  peaks: Float32Array;
  durationSec: number;
}

function placeholderPeaks(): Float32Array {
  const peaks = new Float32Array(WAVEFORM_PEAK_COUNT);
  for (let i = 0; i < peaks.length; i++) {
    peaks[i] = 0.12 + Math.sin(i / 8) * 0.04;
  }
  return peaks;
}

async function loadVideoWaveform(
  assetPath: string,
): Promise<MediaWaveformData | null> {
  try {
    const buffer = await loadAudioBuffer(assetPath);
    if (buffer) {
      return {
        peaks: computeWaveformPeaks(buffer),
        durationSec: buffer.duration,
      };
    }
  } catch {
    /* video container may not decode as audio */
  }

  await ensureMediaDurationSec(assetPath);
  const durationSec = getMediaDurationSec(assetPath);
  if (durationSec === undefined) return null;

  return {
    peaks: placeholderPeaks(),
    durationSec,
  };
}

export function useMediaWaveform(
  assetPath: string | undefined,
  mediaKind: MediaWaveformKind = "audio",
): {
  data: MediaWaveformData | null;
  loading: boolean;
  missing: boolean;
} {
  const [data, setData] = useState<MediaWaveformData | null>(null);
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!assetPath) {
      setData(null);
      setLoading(false);
      setMissing(false);
      return;
    }

    if (!vfsHas(assetPath)) {
      setData(null);
      setLoading(false);
      setMissing(true);
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (mediaKind === "audio") {
        const cached = getCachedAudioBuffer(assetPath);
        if (cached) {
          if (cancelled) return;
          setMissing(false);
          setLoading(false);
          setData({
            peaks: computeWaveformPeaks(cached),
            durationSec: cached.duration,
          });
          return;
        }
      }

      setLoading(true);
      setMissing(false);

      try {
        const result =
          mediaKind === "video"
            ? await loadVideoWaveform(assetPath)
            : await loadAudioBuffer(assetPath).then((buffer) =>
                buffer
                  ? {
                      peaks: computeWaveformPeaks(buffer),
                      durationSec: buffer.duration,
                    }
                  : null,
              );

        if (cancelled) return;
        if (!result) {
          setData(null);
          setMissing(true);
          return;
        }
        setData(result);
        setMissing(false);
      } catch {
        if (!cancelled) {
          setData(null);
          setMissing(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [assetPath, mediaKind]);

  return { data, loading, missing };
}

/** @deprecated Use useMediaWaveform */
export function useAudioWaveform(assetPath: string | undefined) {
  return useMediaWaveform(assetPath, "audio");
}
