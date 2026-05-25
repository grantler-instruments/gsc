import { useMemo, useState } from "react";
import { getFadeTarget, getStopTarget, isFadeCue, isLightFadeCue, isStopCue } from "../../lib/cues";
import type { Cue } from "../../types/cue";

export function useCueListStopHighlights(cues: Cue[], primarySelectedId: string | null) {
  const [hoveredCueId, setHoveredCueId] = useState<string | null>(null);

  const hoveredStopTargetId = useMemo(() => {
    const cue = cues.find((c) => c.id === hoveredCueId);
    if (!cue || !isStopCue(cue)) return null;
    return getStopTarget(cue, cues)?.id ?? null;
  }, [cues, hoveredCueId]);

  const selectedStopTargetId = useMemo(() => {
    const cue = cues.find((c) => c.id === primarySelectedId);
    if (!cue || !isStopCue(cue)) return null;
    return getStopTarget(cue, cues)?.id ?? null;
  }, [cues, primarySelectedId]);

  const hoveredFadeTargetId = useMemo(() => {
    const cue = cues.find((c) => c.id === hoveredCueId);
    if (!cue || !isFadeCue(cue) || isLightFadeCue(cue)) return null;
    return getFadeTarget(cue, cues)?.id ?? null;
  }, [cues, hoveredCueId]);

  const selectedFadeTargetId = useMemo(() => {
    const cue = cues.find((c) => c.id === primarySelectedId);
    if (!cue || !isFadeCue(cue) || isLightFadeCue(cue)) return null;
    return getFadeTarget(cue, cues)?.id ?? null;
  }, [cues, primarySelectedId]);

  const fadeTargetHighlightToken = useMemo(
    () =>
      `${hoveredCueId ?? ""}:${primarySelectedId ?? ""}:${hoveredFadeTargetId ?? ""}:${selectedFadeTargetId ?? ""}`,
    [hoveredCueId, primarySelectedId, hoveredFadeTargetId, selectedFadeTargetId],
  );

  return {
    hoveredCueId,
    setHoveredCueId,
    hoveredStopTargetId,
    selectedStopTargetId,
    hoveredFadeTargetId,
    selectedFadeTargetId,
    fadeTargetHighlightToken,
  };
}
