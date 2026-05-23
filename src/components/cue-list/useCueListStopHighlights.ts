import { useMemo, useState } from "react";
import { getStopTarget, isStopCue } from "../../lib/cues";
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

  return {
    hoveredCueId,
    setHoveredCueId,
    hoveredStopTargetId,
    selectedStopTargetId,
  };
}
