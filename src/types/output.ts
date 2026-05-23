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
  layers: OutputLayer[];
}

export type OutputMessage = { type: "state"; payload: OutputState } | { type: "request-state" };

export const OUTPUT_CHANNEL_NAME = "gsc-output";
