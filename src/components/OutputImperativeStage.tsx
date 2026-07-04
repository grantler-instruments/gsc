import { useEffect, useRef } from "react";
import { outputLayersEqual, outputLayersMediaEqual } from "../lib/output-layer-sync";
import { OutputStageEngine } from "../lib/output-stage-engine";
import { registerOutputStage } from "../lib/output-stage-registry";
import { videoEffectsEqual } from "../lib/video-effects";
import { normalizeVideoOutputFrame, videoOutputFramesEqual } from "../lib/video-output-frame";
import type { OutputLayer } from "../types/output";
import type { VideoEffect } from "../types/video-effect";
import type { VideoOutputFrame } from "../types/video-output-frame";

interface OutputImperativeStageProps {
  layers: OutputLayer[];
  busEffects?: VideoEffect[];
  busOpacity?: number;
  outputFrame?: VideoOutputFrame;
  /** When true, receives imperative fade/effect updates from the output publisher. */
  registerStage?: boolean;
  /** When false, render visible DOM layers (for small embedded previews). */
  useCompositor?: boolean;
  onVideoEnded?: (cueId: string) => void;
}

/** Tauri output compositor — keeps media elements mounted outside React reconciliation. */
export function OutputImperativeStage({
  layers,
  busEffects,
  busOpacity = 1,
  outputFrame,
  registerStage = true,
  useCompositor = true,
  onVideoEnded,
}: OutputImperativeStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OutputStageEngine | null>(null);
  const layersRef = useRef<OutputLayer[]>([]);
  const busEffectsRef = useRef<VideoEffect[] | undefined>(undefined);
  const busOpacityRef = useRef(1);
  const outputFrameRef = useRef<VideoOutputFrame | undefined>(undefined);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (!engineRef.current) {
      engineRef.current = new OutputStageEngine(host, { onVideoEnded, useCompositor });
      if (registerStage) {
        registerOutputStage(engineRef.current);
      }
    }

    return () => {
      if (registerStage) {
        registerOutputStage(null);
      }
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [onVideoEnded, registerStage, useCompositor]);

  useEffect(() => {
    const prev = layersRef.current;
    if (outputLayersMediaEqual(layers, prev)) {
      if (!outputLayersEqual(layers, prev)) {
        layersRef.current = layers;
        engineRef.current?.setOpacities(layers);
      }
      return;
    }
    layersRef.current = layers;
    engineRef.current?.syncLayers(layers);
  }, [layers]);

  useEffect(() => {
    const effects = busEffects ?? [];
    const opacity = busOpacity ?? 1;
    const frame = normalizeVideoOutputFrame(outputFrame);
    if (
      videoEffectsEqual(effects, busEffectsRef.current) &&
      opacity === busOpacityRef.current &&
      videoOutputFramesEqual(frame, outputFrameRef.current)
    ) {
      return;
    }
    busEffectsRef.current = effects;
    busOpacityRef.current = opacity;
    outputFrameRef.current = frame;
    engineRef.current?.syncBusConfig({ effects, opacity, outputFrame: frame });
  }, [busEffects, busOpacity, outputFrame]);

  return (
    <div
      ref={hostRef}
      data-gsc-output-stage=""
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "100%",
        background: "#000",
        overflow: "hidden",
      }}
    />
  );
}
