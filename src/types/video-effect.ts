export const VIDEO_EFFECT_TYPES = [
  "colorGrade",
  "blur",
  "vignette",
  "bloom",
  "noise",
  "sepia",
  "chromaticAberration",
  "hueSaturation",
  "pixelation",
  "scanline",
  "dotScreen",
] as const;

export type VideoEffectType = (typeof VIDEO_EFFECT_TYPES)[number];

export interface ColorGradeEffectParams {
  /** -1 to 1. */
  brightness: number;
  /** 0 to 2. */
  contrast: number;
  /** 0 to 2. */
  saturation: number;
}

export interface BlurEffectParams {
  /** 0 to 16 px-ish kernel radius. */
  radius: number;
  /** 0–1 wet mix. */
  mix: number;
}

export interface VignetteEffectParams {
  /** 0–1. */
  offset: number;
  /** 0–1. */
  darkness: number;
}

export interface BloomEffectParams {
  /** 0–2. */
  intensity: number;
  /** 0–1 luminance threshold. */
  threshold: number;
}

export interface NoiseEffectParams {
  /** 0–1 wet mix. */
  mix: number;
}

export interface SepiaEffectParams {
  /** 0–1 wet mix. */
  mix: number;
}

export interface ChromaticAberrationEffectParams {
  /** 0–1 aberration strength. */
  offset: number;
  /** 0–1 wet mix. */
  mix: number;
}

export interface HueSaturationEffectParams {
  /** -1 to 1 hue rotation. */
  hue: number;
  /** -1 to 1 saturation shift. */
  saturation: number;
}

export interface PixelationEffectParams {
  /** 1–30 pixel block size. */
  granularity: number;
  /** 0–1 wet mix. */
  mix: number;
}

export interface ScanlineEffectParams {
  /** 0.5–3 line density. */
  density: number;
  /** 0–1 wet mix. */
  mix: number;
}

export interface DotScreenEffectParams {
  /** 0.5–3 dot scale. */
  scale: number;
  /** 0–360 degrees. */
  angle: number;
  /** 0–1 wet mix. */
  mix: number;
}

export type VideoEffectParams =
  | ColorGradeEffectParams
  | BlurEffectParams
  | VignetteEffectParams
  | BloomEffectParams
  | NoiseEffectParams
  | SepiaEffectParams
  | ChromaticAberrationEffectParams
  | HueSaturationEffectParams
  | PixelationEffectParams
  | ScanlineEffectParams
  | DotScreenEffectParams;

export interface ColorGradeVideoEffect {
  id: string;
  type: "colorGrade";
  enabled: boolean;
  params: ColorGradeEffectParams;
}

export interface BlurVideoEffect {
  id: string;
  type: "blur";
  enabled: boolean;
  params: BlurEffectParams;
}

export interface VignetteVideoEffect {
  id: string;
  type: "vignette";
  enabled: boolean;
  params: VignetteEffectParams;
}

export interface BloomVideoEffect {
  id: string;
  type: "bloom";
  enabled: boolean;
  params: BloomEffectParams;
}

export interface NoiseVideoEffect {
  id: string;
  type: "noise";
  enabled: boolean;
  params: NoiseEffectParams;
}

export interface SepiaVideoEffect {
  id: string;
  type: "sepia";
  enabled: boolean;
  params: SepiaEffectParams;
}

export interface ChromaticAberrationVideoEffect {
  id: string;
  type: "chromaticAberration";
  enabled: boolean;
  params: ChromaticAberrationEffectParams;
}

export interface HueSaturationVideoEffect {
  id: string;
  type: "hueSaturation";
  enabled: boolean;
  params: HueSaturationEffectParams;
}

export interface PixelationVideoEffect {
  id: string;
  type: "pixelation";
  enabled: boolean;
  params: PixelationEffectParams;
}

export interface ScanlineVideoEffect {
  id: string;
  type: "scanline";
  enabled: boolean;
  params: ScanlineEffectParams;
}

export interface DotScreenVideoEffect {
  id: string;
  type: "dotScreen";
  enabled: boolean;
  params: DotScreenEffectParams;
}

export type VideoEffect =
  | ColorGradeVideoEffect
  | BlurVideoEffect
  | VignetteVideoEffect
  | BloomVideoEffect
  | NoiseVideoEffect
  | SepiaVideoEffect
  | ChromaticAberrationVideoEffect
  | HueSaturationVideoEffect
  | PixelationVideoEffect
  | ScanlineVideoEffect
  | DotScreenVideoEffect;

export const COLOR_GRADE_BRIGHTNESS_MIN = -1;
export const COLOR_GRADE_BRIGHTNESS_MAX = 1;
export const COLOR_GRADE_CONTRAST_MIN = 0;
export const COLOR_GRADE_CONTRAST_MAX = 2;
export const COLOR_GRADE_SATURATION_MIN = 0;
export const COLOR_GRADE_SATURATION_MAX = 2;

export const BLUR_RADIUS_MIN = 0;
export const BLUR_RADIUS_MAX = 16;

export const VIGNETTE_OFFSET_MIN = 0;
export const VIGNETTE_OFFSET_MAX = 1;
export const VIGNETTE_DARKNESS_MIN = 0;
export const VIGNETTE_DARKNESS_MAX = 1;

export const BLOOM_INTENSITY_MIN = 0;
export const BLOOM_INTENSITY_MAX = 2;
export const BLOOM_THRESHOLD_MIN = 0;
export const BLOOM_THRESHOLD_MAX = 1;

export const CHROMATIC_OFFSET_MIN = 0;
export const CHROMATIC_OFFSET_MAX = 1;

export const HUE_MIN = -1;
export const HUE_MAX = 1;
export const HUE_SATURATION_SHIFT_MIN = -1;
export const HUE_SATURATION_SHIFT_MAX = 1;

export const PIXELATION_GRANULARITY_MIN = 1;
export const PIXELATION_GRANULARITY_MAX = 30;

export const SCANLINE_DENSITY_MIN = 0.5;
export const SCANLINE_DENSITY_MAX = 3;

export const DOT_SCREEN_SCALE_MIN = 0.5;
export const DOT_SCREEN_SCALE_MAX = 3;
export const DOT_SCREEN_ANGLE_MIN = 0;
export const DOT_SCREEN_ANGLE_MAX = 360;
