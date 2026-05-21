import { useEffect, useState } from "react";
import {
  getCachedAudioBuffer,
  loadAudioBuffer,
} from "../audio/buffer-cache";
import { computeWaveformPeaks } from "../lib/waveform";
import { vfsHas } from "../vfs/engine";

export interface AudioWaveformData {
  peaks: Float32Array;
  durationSec: number;
}

export function useAudioWaveform(assetPath: string | undefined): {
  data: AudioWaveformData | null;
  loading: boolean;
  missing: boolean;
} {
  const [data, setData] = useState<AudioWaveformData | null>(null);
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

      setLoading(true);
      setMissing(false);
      try {
        const buffer = await loadAudioBuffer(assetPath);
        if (cancelled) return;
        if (!buffer) {
          setData(null);
          setMissing(true);
          setLoading(false);
          return;
        }
        setData({
          peaks: computeWaveformPeaks(buffer),
          durationSec: buffer.duration,
        });
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
  }, [assetPath]);

  return { data, loading, missing };
}
