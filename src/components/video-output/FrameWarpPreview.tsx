import { useEffect, useLayoutEffect, useRef } from "react";
import {
  type FrameWarpPreviewEngine,
  tryCreateFrameWarpPreviewEngine,
} from "../../lib/frame-warp-preview-engine";
import { outputLayersEqual, outputLayersMediaEqual } from "../../lib/output-layer-sync";
import { normalizeVideoOutputFrame } from "../../lib/video-output-frame";
import type { OutputLayer } from "../../types/output";
import type { VideoOutputFrame } from "../../types/video-output-frame";

interface FrameWarpPreviewProps {
  layers: OutputLayer[];
  outputFrame: VideoOutputFrame;
  busOpacity?: number;
  width: number;
  height: number;
}

export function FrameWarpPreview({
  layers,
  outputFrame,
  busOpacity = 1,
  width,
  height,
}: FrameWarpPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FrameWarpPreviewEngine | null>(null);
  const layersRef = useRef(layers);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const engine = tryCreateFrameWarpPreviewEngine(host);
    if (!engine) return;

    engineRef.current = engine;
    engine.start();
    engine.resize(width, height);
    engine.syncLayers(layers);
    engine.setOutputFrame(normalizeVideoOutputFrame(outputFrame));
    engine.setBusOpacity(busOpacity);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [width, height]);

  useEffect(() => {
    const prev = layersRef.current;
    if (outputLayersMediaEqual(layers, prev)) {
      if (!outputLayersEqual(layers, prev)) {
        layersRef.current = layers;
        engineRef.current?.syncLayers(layers);
      }
      return;
    }
    layersRef.current = layers;
    engineRef.current?.syncLayers(layers);
  }, [layers]);

  useEffect(() => {
    engineRef.current?.setOutputFrame(normalizeVideoOutputFrame(outputFrame));
  }, [outputFrame]);

  useEffect(() => {
    engineRef.current?.setBusOpacity(busOpacity);
    engineRef.current?.syncLayers(layersRef.current);
  }, [busOpacity]);

  useLayoutEffect(() => {
    engineRef.current?.resize(width, height);
  }, [width, height, layers, outputFrame, busOpacity]);

  return (
    <div
      ref={hostRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#000",
        pointerEvents: "none",
      }}
    />
  );
}
