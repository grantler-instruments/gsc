import type {
  AudioEffect,
  AudioEffectType,
  DelayAudioEffect,
  DelayEffectParams,
  EqAudioEffect,
  EqEffectParams,
  ReverbAudioEffect,
  ReverbEffectParams,
} from "../types/audio-effect";
import {
  DELAY_FEEDBACK_MAX,
  DELAY_TIME_MAX_SEC,
  DELAY_TIME_MIN_SEC,
  EQ_GAIN_MAX_DB,
  EQ_GAIN_MIN_DB,
  REVERB_DECAY_MAX_SEC,
  REVERB_DECAY_MIN_SEC,
} from "../types/audio-effect";
import { clamp01 } from "./clamp";
import { randomId } from "./random-id";

export function clampEqGainDb(value: number): number {
  return Math.max(EQ_GAIN_MIN_DB, Math.min(EQ_GAIN_MAX_DB, value));
}

export function normalizeEqParams(params: Partial<EqEffectParams> | undefined): EqEffectParams {
  return {
    lowGain: clampEqGainDb(params?.lowGain ?? 0),
    midGain: clampEqGainDb(params?.midGain ?? 0),
    highGain: clampEqGainDb(params?.highGain ?? 0),
  };
}

export function normalizeDelayParams(
  params: Partial<DelayEffectParams> | undefined,
): DelayEffectParams {
  return {
    timeSec: Math.max(DELAY_TIME_MIN_SEC, Math.min(DELAY_TIME_MAX_SEC, params?.timeSec ?? 0.25)),
    feedback: Math.max(0, Math.min(DELAY_FEEDBACK_MAX, params?.feedback ?? 0.35)),
    mix: clamp01(params?.mix ?? 0.25),
  };
}

export function normalizeReverbParams(
  params: Partial<ReverbEffectParams> | undefined,
): ReverbEffectParams {
  return {
    decaySec: Math.max(
      REVERB_DECAY_MIN_SEC,
      Math.min(REVERB_DECAY_MAX_SEC, params?.decaySec ?? 1.5),
    ),
    mix: clamp01(params?.mix ?? 0.3),
  };
}

export function defaultEqEffect(): EqAudioEffect {
  return {
    id: randomId(),
    type: "eq",
    enabled: true,
    params: normalizeEqParams(undefined),
  };
}

export function defaultDelayEffect(): DelayAudioEffect {
  return {
    id: randomId(),
    type: "delay",
    enabled: true,
    params: normalizeDelayParams(undefined),
  };
}

export function defaultReverbEffect(): ReverbAudioEffect {
  return {
    id: randomId(),
    type: "reverb",
    enabled: true,
    params: normalizeReverbParams(undefined),
  };
}

export function createDefaultBusEffect(type: AudioEffectType): AudioEffect {
  switch (type) {
    case "eq":
      return defaultEqEffect();
    case "delay":
      return defaultDelayEffect();
    case "reverb":
      return defaultReverbEffect();
  }
}

export function normalizeAudioEffect(raw: AudioEffect): AudioEffect;
export function normalizeAudioEffect(
  raw: Partial<AudioEffect> & Pick<AudioEffect, "id">,
): AudioEffect;
export function normalizeAudioEffect(
  raw: Partial<AudioEffect> & Pick<AudioEffect, "id">,
): AudioEffect {
  switch (raw.type) {
    case "delay":
      return {
        id: raw.id,
        type: "delay",
        enabled: raw.enabled !== false,
        params: normalizeDelayParams(raw.params as Partial<DelayEffectParams> | undefined),
      };
    case "reverb":
      return {
        id: raw.id,
        type: "reverb",
        enabled: raw.enabled !== false,
        params: normalizeReverbParams(raw.params as Partial<ReverbEffectParams> | undefined),
      };
    case "eq":
    default:
      return {
        id: raw.id,
        type: "eq",
        enabled: raw.enabled !== false,
        params: normalizeEqParams(raw.params as Partial<EqEffectParams> | undefined),
      };
  }
}

export function normalizeAudioEffects(effects: AudioEffect[] | undefined): AudioEffect[] {
  if (!effects?.length) return [];
  return effects.map((effect) => normalizeAudioEffect(effect));
}

export function busHasEffectType(bus: { effects?: AudioEffect[] }, type: AudioEffectType): boolean {
  return bus.effects?.some((effect) => effect.type === type) ?? false;
}

/**
 * Reorder `effects` by moving `draggedId` before/after `targetId`.
 * Returns a new array, or null when the move is a no-op or ids are missing.
 */
export function reorderAudioEffects(
  effects: AudioEffect[],
  draggedId: string,
  targetId: string,
  place: "before" | "after",
): AudioEffect[] | null {
  if (draggedId === targetId) return null;
  const fromIndex = effects.findIndex((effect) => effect.id === draggedId);
  if (fromIndex === -1 || !effects.some((effect) => effect.id === targetId)) return null;

  const next = [...effects];
  const [moved] = next.splice(fromIndex, 1);
  const targetIndex = next.findIndex((effect) => effect.id === targetId);
  const insertAt = place === "after" ? targetIndex + 1 : targetIndex;
  next.splice(insertAt, 0, moved);

  const unchanged = next.every((effect, index) => effect.id === effects[index].id);
  return unchanged ? null : next;
}

export function mergeEffectParams(
  effect: EqAudioEffect,
  patch: Partial<EqEffectParams & DelayEffectParams & ReverbEffectParams> | undefined,
): EqEffectParams;
export function mergeEffectParams(
  effect: DelayAudioEffect,
  patch: Partial<EqEffectParams & DelayEffectParams & ReverbEffectParams> | undefined,
): DelayEffectParams;
export function mergeEffectParams(
  effect: ReverbAudioEffect,
  patch: Partial<EqEffectParams & DelayEffectParams & ReverbEffectParams> | undefined,
): ReverbEffectParams;
export function mergeEffectParams(
  effect: AudioEffect,
  patch: Partial<EqEffectParams & DelayEffectParams & ReverbEffectParams> | undefined,
): AudioEffect["params"] {
  if (!patch) return effect.params;
  switch (effect.type) {
    case "eq":
      return normalizeEqParams({ ...effect.params, ...patch });
    case "delay":
      return normalizeDelayParams({ ...effect.params, ...patch });
    case "reverb":
      return normalizeReverbParams({ ...effect.params, ...patch });
  }
}

export function effectChainKey(effects: AudioEffect[] | undefined): string {
  if (!effects?.length) return "";
  return effects.map((effect) => `${effect.id}:${effect.type}`).join("|");
}

/** @deprecated Use bus.effects directly */
export function getBusEqEffect(bus: { effects?: AudioEffect[] }): EqAudioEffect | undefined {
  return bus.effects?.find((effect): effect is EqAudioEffect => effect.type === "eq");
}
