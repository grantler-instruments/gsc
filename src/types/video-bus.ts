import type { VideoEffect } from "./video-effect";

/** Visual program mix — groups video/image cues before destinations. */
export interface VideoBus {
  id: string;
  name: string;
  /** 0–1 master dimmer for the whole bus. */
  opacity: number;
  muted?: boolean;
  /** Insert effects applied after layer composite, before the master dimmer. */
  effects?: VideoEffect[];
}
