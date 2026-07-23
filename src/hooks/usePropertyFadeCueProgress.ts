import { useMemo } from "react";
import { computePropertyFadeProgressSnapshot, useFadeStore } from "../stores/fade";
import type { CuePlaybackProgress } from "../stores/playback";

function findPropertyFade(
  cueId: string,
  fades: ReturnType<typeof useFadeStore.getState>["fadesByTargetId"],
) {
  return (
    fades[cueId] ?? Object.values(fades).find((activeFade) => activeFade.sourceFadeCueId === cueId)
  );
}

/**
 * Live progress for a property fade affecting `cueId` or started by its fade cue.
 */
export function usePropertyFadeCueProgress(cueId: string): CuePlaybackProgress | undefined {
  const fade = useFadeStore((s) => findPropertyFade(cueId, s.fadesByTargetId));
  const frameMs = useFadeStore((s) => (findPropertyFade(cueId, s.fadesByTargetId) ? s.frameMs : 0));

  return useMemo(() => {
    if (!fade) return undefined;

    const nowMs = frameMs || performance.now();
    const snapshot = computePropertyFadeProgressSnapshot(fade, nowMs);

    return {
      cueId,
      elapsedSec: snapshot.positionSec,
      sliceSec: fade.durationSec,
      ...snapshot,
    };
  }, [cueId, fade, frameMs]);
}
