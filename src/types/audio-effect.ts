export type AudioEffectType = "eq" | "delay" | "reverb";

export interface EqEffectParams {
  /** dB, typically -12 to +12. */
  lowGain: number;
  midGain: number;
  highGain: number;
}

export interface DelayEffectParams {
  /** Seconds. */
  timeSec: number;
  /** 0–1 feedback amount. */
  feedback: number;
  /** 0–1 wet mix. */
  mix: number;
}

export interface ReverbEffectParams {
  /** Seconds. */
  decaySec: number;
  /** 0–1 wet mix. */
  mix: number;
}

export interface EqAudioEffect {
  id: string;
  type: "eq";
  enabled: boolean;
  params: EqEffectParams;
}

export interface DelayAudioEffect {
  id: string;
  type: "delay";
  enabled: boolean;
  params: DelayEffectParams;
}

export interface ReverbAudioEffect {
  id: string;
  type: "reverb";
  enabled: boolean;
  params: ReverbEffectParams;
}

export type AudioEffect = EqAudioEffect | DelayAudioEffect | ReverbAudioEffect;

export const EQ_GAIN_MIN_DB = -12;
export const EQ_GAIN_MAX_DB = 12;

export const DELAY_TIME_MIN_SEC = 0.05;
export const DELAY_TIME_MAX_SEC = 1.5;
export const DELAY_FEEDBACK_MAX = 0.9;

export const REVERB_DECAY_MIN_SEC = 0.3;
export const REVERB_DECAY_MAX_SEC = 4;
