import type { VideoEffect } from "./video-effect";
import type { VideoOutputFrame } from "./video-output-frame";

/** Visual output destination — routes video/image cues to a dedicated output window. */
export interface VideoBus {
  id: string;
  name: string;
  /** 0–1 master dimmer for the whole bus. */
  opacity: number;
  muted?: boolean;
  /** Insert effects applied after layer composite, before the master dimmer. */
  effects?: VideoEffect[];
  /** Crop and placement on the output canvas (before future warp). */
  outputFrame?: VideoOutputFrame;
}
