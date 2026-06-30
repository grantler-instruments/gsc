import { normalizeDelayParams } from "../../lib/audio-effects";
import type { AudioEffect, DelayAudioEffect } from "../../types/audio-effect";
import { DELAY_TIME_MAX_SEC } from "../../types/audio-effect";
import type { BusEffectRuntime } from "./types";

export function createDelayEffect(ctx: AudioContext): BusEffectRuntime {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const delay = ctx.createDelay(DELAY_TIME_MAX_SEC);
  const feedback = ctx.createGain();

  input.connect(dry);
  dry.connect(output);
  input.connect(delay);
  delay.connect(wet);
  wet.connect(output);
  delay.connect(feedback);
  feedback.connect(delay);

  const bypass = () => {
    dry.gain.value = 1;
    wet.gain.value = 0;
    feedback.gain.value = 0;
  };

  bypass();

  return {
    id: "",
    type: "delay",
    input,
    output,
    apply(effect: AudioEffect) {
      if (effect.type !== "delay" || !effect.enabled) {
        bypass();
        return;
      }
      const params = normalizeDelayParams((effect as DelayAudioEffect).params);
      delay.delayTime.value = params.timeSec;
      feedback.gain.value = params.feedback;
      wet.gain.value = params.mix;
      dry.gain.value = 1 - params.mix;
    },
    dispose() {
      input.disconnect();
      output.disconnect();
      dry.disconnect();
      wet.disconnect();
      delay.disconnect();
      feedback.disconnect();
    },
  };
}
