import { useMemo, useState } from "react";
import { getCueTargetId } from "../../lib/cues";
import type { Cue } from "../../types/cue";

export function useCueListTargetHighlights(cues: Cue[], primarySelectedId: string | null) {
  const [hoveredCueId, setHoveredCueId] = useState<string | null>(null);

  const hoveredTargetId = useMemo(() => {
    const cue = cues.find((c) => c.id === hoveredCueId);
    if (!cue) return null;
    return getCueTargetId(cue, cues);
  }, [cues, hoveredCueId]);

  const selectedTargetId = useMemo(() => {
    const cue = cues.find((c) => c.id === primarySelectedId);
    if (!cue) return null;
    return getCueTargetId(cue, cues);
  }, [cues, primarySelectedId]);

  const targetHighlightToken = useMemo(
    () =>
      `${hoveredCueId ?? ""}:${primarySelectedId ?? ""}:${hoveredTargetId ?? ""}:${selectedTargetId ?? ""}`,
    [hoveredCueId, primarySelectedId, hoveredTargetId, selectedTargetId],
  );

  return {
    hoveredCueId,
    setHoveredCueId,
    hoveredTargetId,
    selectedTargetId,
    targetHighlightToken,
  };
}
