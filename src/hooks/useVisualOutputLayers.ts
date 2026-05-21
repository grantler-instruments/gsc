import { useMemo } from "react";
import { buildOutputState } from "../lib/output-state";
import { useFadeStore } from "../stores/fade";
import { usePlaybackStore } from "../stores/playback";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { OutputLayer } from "../types/output";

/** Live visual layers for the in-app preview monitor. */
export function useVisualOutputLayers(): OutputLayer[] {
  const activeCueIds = useTransportStore((s) => s.activeCueIds);
  const cues = useProjectStore(
    (s) =>
      (s.cueLists.find((l) => l.id === s.activeCueListId) ?? s.cueLists[0])
        ?.cues ?? [],
  );
  const byCueId = usePlaybackStore((s) => s.byCueId);
  const frameMs = useFadeStore((s) => s.frameMs);

  return useMemo(
    () => buildOutputState(0).layers,
    [activeCueIds, cues, byCueId, frameMs],
  );
}
