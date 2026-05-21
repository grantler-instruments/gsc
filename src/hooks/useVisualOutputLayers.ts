import { useEffect, useState } from "react";
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
  const [layers, setLayers] = useState<OutputLayer[]>([]);

  useEffect(() => {
    let cancelled = false;
    void buildOutputState(0).then((state) => {
      if (!cancelled) setLayers(state.layers);
    });
    return () => {
      cancelled = true;
    };
  }, [activeCueIds, cues, byCueId, frameMs]);

  return layers;
}
