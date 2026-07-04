import type { VideoEffect } from "./video-effect";

/** Visual output destination — routes video/image cues to a dedicated output window. */
export interface VideoBus {
  id: string;
  name: string;
  /** 0–1 master dimmer for the whole bus. */
  opacity: number;
  muted?: boolean;
  /** Insert effects applied after layer composite, before the master dimmer. */
  effects?: VideoEffect[];
}
