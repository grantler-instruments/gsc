import type { OutputLayer } from "../types/output";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Update output layer opacity in the DOM without React re-renders. */
export function applyOutputLayerOpacities(layers: OutputLayer[]): void {
  for (const layer of layers) {
    const node = document.querySelector<HTMLElement>(`[data-gsc-output-layer="${layer.cueId}"]`);
    if (!node) continue;
    node.style.opacity = String(clamp01(layer.opacity));
  }
}
