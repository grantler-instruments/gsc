import type { AudioEffect } from "./audio-effect";

/** Internal mix bus — groups cues before the master output. */
export interface AudioBus {
  id: string;
  name: string;
  /** 0–1 fader level. */
  volume: number;
  muted?: boolean;
  /** Insert effects applied after bus input, before the fader. */
  effects?: AudioEffect[];
}
