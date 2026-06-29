import type { AudioEffect } from "./audio-effect";

/** Internal mix bus — groups cues before the master output. */
export interface AudioBus {
  id: string;
  name: string;
  /** 0–1 fader level. */
  volume: number;
  muted?: boolean;
  /** -1 (full left) to 1 (full right). */
  pan?: number;
  /** Post-fader destination bus; unset routes to master output. */
  outputBusId?: string;
  /** Insert effects applied after bus input, before the fader. */
  effects?: AudioEffect[];
}
