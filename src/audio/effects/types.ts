import type { AudioEffect } from "../../types/audio-effect";

export interface BusEffectRuntime {
  id: string;
  type: AudioEffect["type"];
  input: AudioNode;
  output: AudioNode;
  apply: (effect: AudioEffect) => void;
  dispose: () => void;
}
