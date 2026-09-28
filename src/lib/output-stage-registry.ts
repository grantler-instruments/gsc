import type { OutputLayer } from "../types/output";
import type { VideoEffect } from "../types/video-effect";
import type { VideoOutputFrame } from "../types/video-output-frame";

export interface OutputBusConfig {
  effects: VideoEffect[];
  opacity: number;
  outputFrame: VideoOutputFrame;
}

export interface OutputStageHandle {
  setOpacities(layers: OutputLayer[]): void;
  syncBusConfig(config: OutputBusConfig): void;
}

let activeHandle: OutputStageHandle | null = null;

export function registerOutputStage(handle: OutputStageHandle | null): void {
  activeHandle = handle;
}

export function applyRegisteredOutputOpacities(layers: OutputLayer[]): void {
  activeHandle?.setOpacities(layers);
}

export function applyRegisteredOutputBusConfig(config: OutputBusConfig): void {
  activeHandle?.syncBusConfig(config);
}
