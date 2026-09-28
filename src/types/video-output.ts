import type { VideoOutputFrame } from "./video-output-frame";

/** Physical/logical destination that displays a video bus program. */
export type VideoOutputKind = "window" | "ndi";

/** Stable id for the default master window output created on new/migrated projects. */
export const MASTER_VIDEO_OUTPUT_ID = "master";

export interface VideoOutput {
  id: string;
  name: string;
  kind: VideoOutputKind;
  /** Program bus to display; unset shows the master program. */
  busId?: string;
  /** Crop, placement, and corner-pin warp on this destination. */
  outputFrame?: VideoOutputFrame;
}
