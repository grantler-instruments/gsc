import { useEffect, useMemo, useState } from "react";
import { getMediaDurationSec } from "../lib/media-duration";
import { isOutputLayerFadeAnimating, outputLayerOpacityAt } from "../lib/output-opacity";
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
  const releasingCues = useTransportStore((s) => s.releasingCues);
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
  const [envelopeFrameMs, setEnvelopeFrameMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void activeCueIds;
    void cues;
    void cueStartedAtMs;
    void releasingCues;
    void buildOutputState(0).then((state) => {
      if (!cancelled) setBaseLayers(state.layers);
    });
    return () => {
      cancelled = true;
    };
  }, [activeCueIds, cueLists, cueStartedAtMs, releasingCues]);

  // Re-render only while a built-in fade envelope is moving.
  useEffect(() => {
    if (!baseLayers.some((layer) => layer.fade)) return;
    let rafId = 0;
    const tick = () => {
      const now = Date.now();
      if (
        baseLayers.some((layer) =>
          isOutputLayerFadeAnimating(layer, now, getMediaDurationSec(layer.assetPath)),
        )
      ) {
        setEnvelopeFrameMs(now);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [baseLayers]);

  return useMemo(() => {
    void envelopeFrameMs;
    if (frameMs === 0 && !baseLayers.some((layer) => layer.fade)) return baseLayers;

    const now = Date.now();
    const cueById = new Map(cues.map((c) => [c.id, c]));
    return baseLayers.map((layer) => {
      const cue = cueById.get(layer.cueId);
      if (!cue) return layer;
      const base = resolveEffectiveOpacity(
        cue.id,
        clamp01(cue.opacity ?? 1),
        frameMs || performance.now(),
      );
      const opacity = outputLayerOpacityAt(
        { ...layer, opacity: base },
        now,
        getMediaDurationSec(layer.assetPath),
      );
      return opacity === layer.opacity ? layer : { ...layer, opacity };
    });
  }, [baseLayers, cues, frameMs, envelopeFrameMs]);
}
