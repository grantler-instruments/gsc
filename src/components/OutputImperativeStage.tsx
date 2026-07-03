import { useEffect, useRef } from "react";
import { outputLayersMediaEqual } from "../lib/output-layer-sync";
import { OutputStageEngine } from "../lib/output-stage-engine";
import type { OutputLayer } from "../types/output";

interface OutputImperativeStageProps {
  layers: OutputLayer[];
}

/** Tauri output compositor — keeps media elements mounted outside React reconciliation. */
export function OutputImperativeStage({ layers }: OutputImperativeStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OutputStageEngine | null>(null);
  const layersRef = useRef<OutputLayer[]>([]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (!engineRef.current) {
      engineRef.current = new OutputStageEngine(host);
    }

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (outputLayersMediaEqual(layers, layersRef.current)) return;
    layersRef.current = layers;
    engineRef.current?.syncLayers(layers);
  }, [layers]);

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
