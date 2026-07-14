import { useEffect, useMemo, useState } from "react";
import { buildOutputState } from "../lib/output-state";
import { resolveEffectiveOpacity, useFadeStore } from "../stores/fade";
import { useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import type { OutputLayer } from "../types/output";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Live visual layers for the in-app preview monitor. */
export function useVisualOutputLayers(): OutputLayer[] {
  const activeCueIds = useTransportStore((s) => s.activeCueIds);
  const cueStartedAtMs = useTransportStore((s) => s.cueStartedAtMs);
  const cueLists = useProjectStore((s) => s.cueLists);
  const cues = useMemo(
    () =>
      cueLists.reduce(
        (all, list) => all.concat(list.cues),
        [] as (typeof cueLists)[number]["cues"],
      ),
    [cueLists],
  );
  const frameMs = useFadeStore((s) => s.frameMs);
  const [baseLayers, setBaseLayers] = useState<OutputLayer[]>([]);

  useEffect(() => {
    let cancelled = false;
    void activeCueIds;
    void cues;
    void cueStartedAtMs;
    void buildOutputState(0).then((state) => {
      if (!cancelled) setBaseLayers(state.layers);
    });
    return () => {
      cancelled = true;
    };
  }, [activeCueIds, cueLists, cueStartedAtMs]);

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
