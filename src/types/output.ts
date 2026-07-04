import type { VideoEffect } from "./video-effect";
import type { VideoOutputFrame } from "./video-output-frame";

/** Visual layer snapshot sent to the output window. */
export interface OutputLayer {
  cueId: string;
  type: "video" | "image";
  /** Virtual path — output window loads bytes from shared asset cache. */
  assetPath: string;
  /** Local blob URL in the publisher window (control preview only). */
  objectUrl: string;
  opacity: number;
  /** 0–1 playback level (video cues). */
  volume: number;
  inTime: number;
  outTime?: number;
  sliceSec: number;
  /** Wall-clock ms when the cue was triggered. */
  goAtMs: number;
  loop: boolean;
  loopCount: number | "inf";
}

export interface OutputState {
  revision: number;
  projectId: string;
  /** Undefined = master output window; otherwise the assigned video bus id. */
  busId?: string;
  /** Display name for bus output windows. */
  busName?: string;
  /** Tauri: lets the output webview read assets from disk instead of BroadcastChannel blobs. */
  projectRootDir: string | null;
  /** Active transport cue ids — output keeps showing while non-empty even if layers are still loading. */
  activeCueIds: string[];
  layers: OutputLayer[];
  /** Bus insert effects — applied after layer composite in the output compositor. */
  busEffects?: VideoEffect[];
  /** 0–1 master dimmer applied after bus effects. */
  busOpacity?: number;
  /** Crop and placement on the output canvas. */
  outputFrame?: VideoOutputFrame;
}

/** One destination in the in-app multiview preview. */
export interface OutputPreviewDestination {
  /** Undefined = master output. */
  busId?: string;
  busName: string;
  layers: OutputLayer[];
  /** Bus insert effects — same pipeline as the output window compositor. */
  busEffects?: VideoEffect[];
  /** 0–1 master dimmer applied after bus effects. */
  busOpacity?: number;
  outputFrame?: VideoOutputFrame;
}

export interface MultiviewPreviewState {
  revision: number;
  projectId: string;
  destinations: OutputPreviewDestination[];
}

export type OutputMessage =
  | { type: "state"; payload: OutputState }
  | { type: "request-state"; busId?: string }
  | { type: "asset"; payload: { projectId: string; assetPath: string; blob: Blob } };

export const OUTPUT_CHANNEL_NAME = "gsc-output";

/** BroadcastChannel name for a visual output destination. */
export function outputChannelName(busId?: string): string {
  return busId ? `${OUTPUT_CHANNEL_NAME}-bus-${busId}` : OUTPUT_CHANNEL_NAME;
}

/** Read the optional video bus id from an output window URL. */
export function getOutputBusIdFromUrl(search?: string): string | undefined {
  const query = search ?? (typeof window !== "undefined" ? window.location.search : "");
  const busId = new URLSearchParams(query).get("bus");
  return busId || undefined;
}
