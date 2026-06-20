import { busEffectiveVolume } from "../lib/audio-buses";
import { effectChainKey } from "../lib/audio-effects";
import type { AudioBus } from "../types/audio-bus";
import type { AudioEffect } from "../types/audio-effect";
import { buildBusEffectChain } from "./effects/chain";
import type { BusEffectRuntime } from "./effects/types";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

interface BusRuntime {
  input: GainNode;
  fader: GainNode;
  effectChainKey: string;
  effectRuntimes: BusEffectRuntime[];
}

/** Web Audio subgraph for project-defined mix buses. */
export class MixerGraph {
  private buses = new Map<string, BusRuntime>();
  private master: GainNode;

  constructor(private ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
  }

  dispose(): void {
    for (const runtime of this.buses.values()) {
      this.disposeBusRuntime(runtime);
    }
    this.buses.clear();
    this.master.disconnect();
  }

  setMasterVolume(volume: number): void {
    this.master.gain.value = clamp01(volume);
  }

  private disposeBusRuntime(runtime: BusRuntime): void {
    runtime.input.disconnect();
    runtime.fader.disconnect();
    for (const effect of runtime.effectRuntimes) {
      effect.dispose();
    }
  }

  private reconnectBusEffects(runtime: BusRuntime, effects: AudioEffect[]): void {
    runtime.input.disconnect();
    for (const effect of runtime.effectRuntimes) {
      effect.dispose();
    }

    runtime.effectRuntimes = buildBusEffectChain(this.ctx, effects);
    runtime.effectChainKey = effectChainKey(effects);

    // Re-wire fader → master and clear stale effect connections into the fader.
    runtime.fader.disconnect();
    runtime.fader.connect(this.master);

    let tail: AudioNode = runtime.input;
    for (let index = 0; index < runtime.effectRuntimes.length; index++) {
      const effectRuntime = runtime.effectRuntimes[index];
      tail.connect(effectRuntime.input);
      tail = effectRuntime.output;
      effectRuntime.apply(effects[index]);
    }
    tail.connect(runtime.fader);
  }

  private applyBusEffectParams(runtime: BusRuntime, effects: AudioEffect[]): void {
    for (let index = 0; index < runtime.effectRuntimes.length; index++) {
      runtime.effectRuntimes[index]?.apply(effects[index]);
    }
  }

  /** Reconcile bus nodes with project config. */
  sync(buses: AudioBus[]): void {
    const nextIds = new Set(buses.map((bus) => bus.id));

    for (const [id, runtime] of this.buses) {
      if (!nextIds.has(id)) {
        this.disposeBusRuntime(runtime);
        this.buses.delete(id);
      }
    }

    for (const bus of buses) {
      const effects = bus.effects ?? [];
      const chainKey = effectChainKey(effects);
      let runtime = this.buses.get(bus.id);

      if (!runtime) {
        const input = this.ctx.createGain();
        input.gain.value = 1;
        const fader = this.ctx.createGain();
        runtime = {
          input,
          fader,
          effectChainKey: "",
          effectRuntimes: [],
        };
        this.buses.set(bus.id, runtime);
        this.reconnectBusEffects(runtime, effects);
      } else if (runtime.effectChainKey !== chainKey) {
        this.reconnectBusEffects(runtime, effects);
      } else {
        this.applyBusEffectParams(runtime, effects);
      }

      runtime.fader.gain.value = busEffectiveVolume(bus);
    }
  }

  /** Connect voices here for bus routing; omit bus id for direct-to-master. */
  resolveOutput(busId: string | undefined): AudioNode {
    if (!busId) return this.master;
    return this.buses.get(busId)?.input ?? this.master;
  }

  get masterOutput(): AudioNode {
    return this.master;
  }
}
