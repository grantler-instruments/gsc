import type { AudioEffect } from "../../types/audio-effect";
import type { BusEffectRuntime } from "./types";

// Shared by the browser worklet and DSP regression tests. No main-thread timers are
// involved, so ducking and peak limiting continue while the UI is busy or hidden.
export const BUS_EFFECTS_WORKLET_SOURCE = `
class BusEffectProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      ["enabled", 1], ["ceilingDb", -1], ["releaseMs", 100],
      ["thresholdDb", -30], ["reductionDb", 12], ["attackMs", 20],
      ["width", 1], ["mono", 0], ["swap", 0], ["invertLeft", 0], ["invertRight", 0],
    ].map(([name, defaultValue]) => ({ name, defaultValue, automationRate: "k-rate" }));
  }
  constructor(options) {
    super();
    this.type = options.processorOptions.type;
    this.gain = 1;
    this.envelope = 0;
    this.alive = true;
    this.port.onmessage = ({ data }) => { if (data === "dispose") this.alive = false; };
  }
  process(inputs, outputs, parameters) {
    if (!this.alive) return false;
    const input = inputs[0] || [];
    const sidechain = inputs[1] || [];
    const output = outputs[0];
    if (!output || !output.length) return true;
    const p = (name) => parameters[name][0];
    const enabled = p("enabled") > 0.5;
    const release = Math.exp(-1 / (Math.max(1, p("releaseMs")) * 0.001 * sampleRate));
    const attack = Math.exp(-1 / (Math.max(1, p("attackMs")) * 0.001 * sampleRate));
    const detectorRelease = Math.exp(-1 / (0.05 * sampleRate));
    const ceiling = Math.pow(10, p("ceilingDb") / 20);
    const threshold = Math.pow(10, p("thresholdDb") / 20);
    const reduction = Math.pow(10, -p("reductionDb") / 20);
    const width = p("mono") > 0.5 ? 0 : p("width");
    const swap = p("swap") > 0.5;
    const polarityLeft = p("invertLeft") > 0.5 ? -1 : 1;
    const polarityRight = p("invertRight") > 0.5 ? -1 : 1;
    for (let i = 0; i < output[0].length; i++) {
      let left = input[0]?.[i] || 0;
      let right = (input[1] || input[0])?.[i] || 0;
      if (!enabled) {
        this.gain = 1;
        this.envelope = 0;
      } else if (this.type === "limiter") {
        // Stereo-linked sample-peak limiting with instantaneous attack. No added latency.
        const peak = Math.max(Math.abs(left), Math.abs(right));
        const target = peak > ceiling ? ceiling / peak : 1;
        this.gain = Math.min(target, 1 - (1 - this.gain) * release);
        left *= this.gain;
        right *= this.gain;
      } else if (this.type === "ducker") {
        let peak = 0;
        for (const channel of sidechain) peak = Math.max(peak, Math.abs(channel[i] || 0));
        this.envelope = Math.max(peak, this.envelope * detectorRelease);
        const target = this.envelope >= threshold ? reduction : 1;
        const coefficient = target < this.gain ? attack : release;
        this.gain = target + (this.gain - target) * coefficient;
        left *= this.gain;
        right *= this.gain;
      } else if (this.type === "stereo") {
        const mid = (left + right) * 0.5;
        const side = (left - right) * 0.5 * width;
        left = (mid + (swap ? -side : side)) * polarityLeft;
        right = (mid + (swap ? side : -side)) * polarityRight;
      }
      output[0][i] = left;
      if (output[1]) output[1][i] = right;
    }
    return true;
  }
}
registerProcessor("gsc-bus-effect", BusEffectProcessor);
`;

const registrations = new WeakMap<BaseAudioContext, Promise<void>>();

export function prepareBusEffects(ctx: BaseAudioContext): Promise<void> {
  const existing = registrations.get(ctx);
  if (existing) return existing;
  const url = URL.createObjectURL(
    new Blob([BUS_EFFECTS_WORKLET_SOURCE], { type: "text/javascript" }),
  );
  const pending = ctx.audioWorklet
    .addModule(url)
    .catch((error) => {
      registrations.delete(ctx);
      throw error;
    })
    .finally(() => URL.revokeObjectURL(url));
  registrations.set(ctx, pending);
  return pending;
}

/** Call prepareBusEffects before constructing a graph with these effects. */
export function createWorkletEffect(
  ctx: AudioContext,
  effect: Extract<AudioEffect, { type: "limiter" | "ducker" | "stereo" }>,
): BusEffectRuntime {
  const node = new AudioWorkletNode(ctx, "gsc-bus-effect", {
    numberOfInputs: effect.type === "ducker" ? 2 : 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    channelCount: 2,
    channelCountMode: "explicit",
    channelInterpretation: "speakers",
    processorOptions: { type: effect.type },
  });
  const runtime: BusEffectRuntime = {
    id: effect.id,
    type: effect.type,
    input: node,
    output: node,
    ...(effect.type === "ducker" ? { sidechain: node } : {}),
    apply(next) {
      if (next.type !== effect.type) return;
      node.parameters.get("enabled")?.setValueAtTime(next.enabled ? 1 : 0, ctx.currentTime);
      for (const [name, value] of Object.entries(next.params)) {
        if (typeof value === "string") continue;
        node.parameters.get(name)?.setValueAtTime(Number(value), ctx.currentTime);
      }
    },
    dispose() {
      node.port.postMessage("dispose");
      node.port.close();
      node.disconnect();
    },
  };
  runtime.apply(effect);
  return runtime;
}
