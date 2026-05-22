import { useMemo } from "react";
import { isContainerCue, isStopCue, isWaitCue } from "../../lib/cues";
import { findProjectCue, useProjectStore } from "../../stores/project";
import { useTransportStore } from "../../stores/transport";
import type { Cue } from "../../types/cue";

export function useActivePlaybackCues(): Cue[] {
  const cueLists = useProjectStore((s) => s.cueLists);
  const activeCueIds = useTransportStore((s) => s.activeCueIds);

  return useMemo(
    () =>
      activeCueIds
        .map((id) => findProjectCue(cueLists, id))
        .filter(
          (c): c is Cue =>
            c !== undefined &&
            !isContainerCue(c) &&
            !isStopCue(c) &&
            !isWaitCue(c),
        ),
    [activeCueIds, cueLists],
  );
}
