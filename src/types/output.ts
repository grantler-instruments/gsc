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
  /** Tauri: lets the output webview read assets from disk instead of BroadcastChannel blobs. */
  projectRootDir: string | null;
  /** Active transport cue ids — output keeps showing while non-empty even if layers are still loading. */
  activeCueIds: string[];
  layers: OutputLayer[];
}

export type OutputMessage =
  | { type: "state"; payload: OutputState }
  | { type: "request-state" }
  | { type: "asset"; payload: { projectId: string; assetPath: string; blob: Blob } };

export const OUTPUT_CHANNEL_NAME = "gsc-output";
