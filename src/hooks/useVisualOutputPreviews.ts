import { useEffect, useState } from "react";
import { buildMultiviewPreviewState } from "../lib/output-state";
import { useFadeStore } from "../stores/fade";
import { usePlaybackStore } from "../stores/playback";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { OutputPreviewDestination } from "../types/output";

/** Live multiview previews — one tile per output window. */
export function useVisualOutputPreviews(): OutputPreviewDestination[] {
  const activeCueIds = useTransportStore((s) => s.activeCueIds);
  const activeCueListId = useProjectStore((s) => s.activeCueListId);
  const cueLists = useProjectStore((s) => s.cueLists);
  const byCueId = usePlaybackStore((s) => s.byCueId);
  const frameMs = useFadeStore((s) => s.frameMs);
  const videoBuses = useProjectStore((s) => s.videoBuses);
  const masterVideoOutputName = useProjectStore((s) => s.masterVideoOutputName);
  const [destinations, setDestinations] = useState<OutputPreviewDestination[]>([]);

  useEffect(() => {
    void activeCueIds;
    void activeCueListId;
    void cueLists;
    void byCueId;
    void frameMs;
    void videoBuses;
    void masterVideoOutputName;
    let cancelled = false;
    void buildMultiviewPreviewState(0).then((state) => {
      if (!cancelled) setDestinations(state.destinations);
    });
    return () => {
      cancelled = true;
    };
  }, [
    activeCueIds,
    activeCueListId,
    cueLists,
    byCueId,
    frameMs,
    videoBuses,
    masterVideoOutputName,
  ]);

  return destinations;
}
