export const AUDIO_EFFECT_TYPES = ["eq", "delay", "reverb", "limiter", "ducker", "stereo"] as const;
export type AudioEffectType = (typeof AUDIO_EFFECT_TYPES)[number];

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

export interface LimiterEffectParams {
  ceilingDb: number;
  releaseMs: number;
}

export interface DuckerEffectParams {
  sourceBusId: string;
  thresholdDb: number;
  reductionDb: number;
  attackMs: number;
  releaseMs: number;
}

export interface StereoEffectParams {
  /** 0 = mono, 1 = original stereo, 2 = double side signal. */
  width: number;
  mono: boolean;
  swap: boolean;
  invertLeft: boolean;
  invertRight: boolean;
}

export interface LimiterAudioEffect {
  id: string;
  type: "limiter";
  enabled: boolean;
  params: LimiterEffectParams;
}

export interface DuckerAudioEffect {
  id: string;
  type: "ducker";
  enabled: boolean;
  params: DuckerEffectParams;
}

export interface StereoAudioEffect {
  id: string;
  type: "stereo";
  enabled: boolean;
  params: StereoEffectParams;
}

export type AudioEffect =
  | EqAudioEffect
  | DelayAudioEffect
  | ReverbAudioEffect
  | LimiterAudioEffect
  | DuckerAudioEffect
  | StereoAudioEffect;

export type AudioEffectParamsPatch = Partial<
  EqEffectParams &
    DelayEffectParams &
    ReverbEffectParams &
    LimiterEffectParams &
    DuckerEffectParams &
    StereoEffectParams
>;

export const EQ_GAIN_MIN_DB = -12;
export const EQ_GAIN_MAX_DB = 12;

export const DELAY_TIME_MIN_SEC = 0.05;
export const DELAY_TIME_MAX_SEC = 1.5;
export const DELAY_FEEDBACK_MAX = 0.9;

export const REVERB_DECAY_MIN_SEC = 0.3;
export const REVERB_DECAY_MAX_SEC = 4;
