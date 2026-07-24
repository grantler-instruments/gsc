import type { OutputLayer } from "../types/output";
import type { OutputBusConfig } from "./output-stage-registry";
import {
  applyRegisteredOutputBusConfig,
  applyRegisteredOutputOpacities,
} from "./output-stage-registry";

/** Update output layer opacity without React re-renders. */
export function applyOutputLayerOpacities(layers: OutputLayer[]): void {
  applyRegisteredOutputOpacities(layers);
}

export function applyOutputBusConfig(config: OutputBusConfig): void {
  applyRegisteredOutputBusConfig(config);
}
