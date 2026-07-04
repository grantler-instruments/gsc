import type { OutputLayer } from "../types/output";
import type { OutputBusConfig } from "./output-stage-registry";
import {
  applyRegisteredOutputBusConfig,
  applyRegisteredOutputOpacities,
} from "./output-stage-registry";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Update output layer opacity without React re-renders. */
export function applyOutputLayerOpacities(layers: OutputLayer[]): void {
  applyRegisteredOutputOpacities(layers);

  for (const layer of layers) {
    const node = document.querySelector<HTMLElement>(`[data-gsc-output-layer="${layer.cueId}"]`);
    if (!node) continue;
    node.style.opacity = String(clamp01(layer.opacity));
  }
}

export function applyOutputBusConfig(config: OutputBusConfig): void {
  applyRegisteredOutputBusConfig(config);
}
