import { useMemo } from "react";
import type { PlaybackProgressSnapshot } from "../lib/playback-slice";
import { computeDmxFadeProgressSnapshot, useFadeStore } from "../stores/fade";
import type { CuePlaybackProgress } from "../stores/playback";

/** Live progress for a running light fade cue, or undefined when idle. */
export function useDmxFadeCueProgress(cueId: string): CuePlaybackProgress | undefined {
  const dmxFade = useFadeStore((s) => s.dmxFadesByFadeCueId[cueId]);
  const frameMs = useFadeStore((s) => (cueId in s.dmxFadesByFadeCueId ? s.frameMs : 0));

  return useMemo(() => {
    if (!dmxFade) return undefined;

    const nowMs = frameMs || performance.now();
    const snapshot: PlaybackProgressSnapshot = computeDmxFadeProgressSnapshot(dmxFade, nowMs);

    return {
      cueId,
      elapsedSec: snapshot.positionSec,
      sliceSec: dmxFade.durationSec,
      ...snapshot,
    };
  }, [cueId, dmxFade, frameMs]);
}
