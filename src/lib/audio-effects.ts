import type {
  AudioEffect,
  AudioEffectParamsPatch,
  AudioEffectType,
  DelayAudioEffect,
  DelayEffectParams,
  DuckerEffectParams,
  EqAudioEffect,
  EqEffectParams,
  LimiterEffectParams,
  ReverbAudioEffect,
  ReverbEffectParams,
  StereoEffectParams,
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
import { randomId } from "./random-id";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

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

function finiteRange(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

export function normalizeLimiterParams(params?: Partial<LimiterEffectParams>): LimiterEffectParams {
  return {
    ceilingDb: finiteRange(params?.ceilingDb, -1, -24, 0),
    releaseMs: finiteRange(params?.releaseMs, 100, 10, 1000),
  };
}

export function normalizeDuckerParams(params?: Partial<DuckerEffectParams>): DuckerEffectParams {
  return {
    sourceBusId: typeof params?.sourceBusId === "string" ? params.sourceBusId : "",
    thresholdDb: finiteRange(params?.thresholdDb, -30, -60, 0),
    reductionDb: finiteRange(params?.reductionDb, 12, 0, 36),
    attackMs: finiteRange(params?.attackMs, 20, 1, 500),
    releaseMs: finiteRange(params?.releaseMs, 300, 10, 2000),
  };
}

export function normalizeStereoParams(params?: Partial<StereoEffectParams>): StereoEffectParams {
  return {
    width: finiteRange(params?.width, 1, 0, 2),
    mono: params?.mono === true,
    swap: params?.swap === true,
    invertLeft: params?.invertLeft === true,
    invertRight: params?.invertRight === true,
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
    case "limiter":
      return { id: randomId(), type, enabled: true, params: normalizeLimiterParams() };
    case "ducker":
      return { id: randomId(), type, enabled: true, params: normalizeDuckerParams() };
    case "stereo":
      return { id: randomId(), type, enabled: true, params: normalizeStereoParams() };
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
    case "limiter":
      return {
        id: raw.id,
        type: raw.type,
        enabled: raw.enabled !== false,
        params: normalizeLimiterParams(raw.params),
      };
    case "ducker":
      return {
        id: raw.id,
        type: raw.type,
        enabled: raw.enabled !== false,
        params: normalizeDuckerParams(raw.params),
      };
    case "stereo":
      return {
        id: raw.id,
        type: raw.type,
        enabled: raw.enabled !== false,
        params: normalizeStereoParams(raw.params),
      };
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

export function mergeEffectParams<T extends AudioEffect>(
  effect: T,
  patch: AudioEffectParamsPatch | undefined,
): T["params"] {
  // Normalization selects only the fields belonging to this effect type.
  return normalizeAudioEffect({ ...effect, params: { ...effect.params, ...patch } } as AudioEffect)
    .params;
}

export function effectChainKey(effects: AudioEffect[] | undefined): string {
  if (!effects?.length) return "";
  return effects.map((effect) => `${effect.id}:${effect.type}`).join("|");
}

/** @deprecated Use bus.effects directly */
export function getBusEqEffect(bus: { effects?: AudioEffect[] }): EqAudioEffect | undefined {
  return bus.effects?.find((effect): effect is EqAudioEffect => effect.type === "eq");
}
