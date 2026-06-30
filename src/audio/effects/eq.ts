import { clampEqGainDb } from "../../lib/audio-effects";
import type { AudioEffect, EqAudioEffect } from "../../types/audio-effect";
import type { BusEffectRuntime } from "./types";

const LOW_FREQ_HZ = 120;
const MID_FREQ_HZ = 1000;
const MID_Q = 1;
const HIGH_FREQ_HZ = 8000;

export function createEqEffect(ctx: AudioContext): BusEffectRuntime {
  const low = ctx.createBiquadFilter();
  low.type = "lowshelf";
  low.frequency.value = LOW_FREQ_HZ;

  const mid = ctx.createBiquadFilter();
  mid.type = "peaking";
  mid.frequency.value = MID_FREQ_HZ;
  mid.Q.value = MID_Q;

  const high = ctx.createBiquadFilter();
  high.type = "highshelf";
  high.frequency.value = HIGH_FREQ_HZ;

  low.connect(mid);
  mid.connect(high);

  const applyFlat = () => {
    low.gain.value = 0;
    mid.gain.value = 0;
    high.gain.value = 0;
  };

  applyFlat();

  return {
    id: "",
    type: "eq",
    input: low,
    output: high,
    apply(effect: AudioEffect) {
      if (effect.type !== "eq" || !effect.enabled) {
        applyFlat();
        return;
      }
      const params = (effect as EqAudioEffect).params;
      low.gain.value = clampEqGainDb(params.lowGain);
      mid.gain.value = clampEqGainDb(params.midGain);
      high.gain.value = clampEqGainDb(params.highGain);
    },
    dispose() {
      low.disconnect();
      mid.disconnect();
      high.disconnect();
    },
  };
}
