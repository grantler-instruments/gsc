import type { AudioEffect } from "../../types/audio-effect";

export interface BusEffectRuntime {
  id: string;
  type: AudioEffect["type"];
  input: AudioNode;
  output: AudioNode;
  /** Trigger input is input 1 of this node. */
  sidechain?: AudioNode;
  apply: (effect: AudioEffect) => void;
  dispose: () => void;
}
