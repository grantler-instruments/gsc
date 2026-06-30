import { normalizeReverbParams } from "../../lib/audio-effects";
import type { AudioEffect, ReverbAudioEffect } from "../../types/audio-effect";
import type { BusEffectRuntime } from "./types";

function createReverbImpulse(ctx: AudioContext, decaySec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * decaySec));
  const impulse = ctx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index++) {
      const envelope = (1 - index / length) ** 2;
      data[index] = (Math.random() * 2 - 1) * envelope;
    }
  }

  return impulse;
}

export function createReverbEffect(ctx: AudioContext): BusEffectRuntime {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const convolver = ctx.createConvolver();

  input.connect(dry);
  dry.connect(output);
  input.connect(convolver);
  convolver.connect(wet);
  wet.connect(output);

  let impulseDecaySec = -1;

  const bypass = () => {
    dry.gain.value = 1;
    wet.gain.value = 0;
  };

  bypass();

  return {
    id: "",
    type: "reverb",
    input,
    output,
    apply(effect: AudioEffect) {
      if (effect.type !== "reverb" || !effect.enabled) {
        bypass();
        return;
      }
      const params = normalizeReverbParams((effect as ReverbAudioEffect).params);
      if (params.decaySec !== impulseDecaySec) {
        convolver.buffer = createReverbImpulse(ctx, params.decaySec);
        impulseDecaySec = params.decaySec;
      }
      wet.gain.value = params.mix;
      dry.gain.value = 1 - params.mix;
    },
    dispose() {
      input.disconnect();
      output.disconnect();
      dry.disconnect();
      wet.disconnect();
      convolver.disconnect();
    },
  };
}
