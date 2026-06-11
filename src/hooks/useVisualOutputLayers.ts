import { useEffect, useMemo, useState } from "react";
import { buildOutputState } from "../lib/output-state";
import { resolveEffectiveOpacity, useFadeStore } from "../stores/fade";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { OutputLayer } from "../types/output";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Live visual layers for the in-app preview monitor. */
export function useVisualOutputLayers(): OutputLayer[] {
  const activeCueIds = useTransportStore((s) => s.activeCueIds);
  const cueStartedAtMs = useTransportStore((s) => s.cueStartedAtMs);
  const cues = useProjectStore((s) => getActiveCueListFromState(s).cues);
  const frameMs = useFadeStore((s) => s.frameMs);
  const [baseLayers, setBaseLayers] = useState<OutputLayer[]>([]);

  useEffect(() => {
    let cancelled = false;
    void buildOutputState(0).then((state) => {
      if (!cancelled) setBaseLayers(state.layers);
    });
    return () => {
      cancelled = true;
    };
  }, [activeCueIds, cues, cueStartedAtMs]);

  return useMemo(() => {
    if (frameMs === 0) return baseLayers;

    const cueById = new Map(cues.map((c) => [c.id, c]));
    return baseLayers.map((layer) => {
      const cue = cueById.get(layer.cueId);
      if (!cue) return layer;
      const opacity = resolveEffectiveOpacity(cue.id, clamp01(cue.opacity ?? 1), frameMs);
      return opacity === layer.opacity ? layer : { ...layer, opacity };
    });
  }, [baseLayers, cues, frameMs]);
}
