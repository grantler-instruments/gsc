import type { AudioEffect } from "../../types/audio-effect";
import { createDelayEffect } from "./delay";
import { createEqEffect } from "./eq";
import { createReverbEffect } from "./reverb";
import type { BusEffectRuntime } from "./types";

export function createBusEffectRuntime(ctx: AudioContext, effect: AudioEffect): BusEffectRuntime {
  switch (effect.type) {
    case "eq": {
      const runtime = createEqEffect(ctx);
      runtime.id = effect.id;
      runtime.apply(effect);
      return runtime;
    }
    case "delay": {
      const runtime = createDelayEffect(ctx);
      runtime.id = effect.id;
      runtime.apply(effect);
      return runtime;
    }
    case "reverb": {
      const runtime = createReverbEffect(ctx);
      runtime.id = effect.id;
      runtime.apply(effect);
      return runtime;
    }
    default:
      throw new Error(`Unsupported audio effect type: ${(effect as AudioEffect).type}`);
  }
}

export function buildBusEffectChain(ctx: AudioContext, effects: AudioEffect[]): BusEffectRuntime[] {
  return effects.map((effect) => createBusEffectRuntime(ctx, effect));
}
