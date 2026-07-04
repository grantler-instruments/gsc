import type {
  BloomEffectParams,
  BloomVideoEffect,
  BlurEffectParams,
  BlurVideoEffect,
  ChromaticAberrationEffectParams,
  ChromaticAberrationVideoEffect,
  ColorGradeEffectParams,
  ColorGradeVideoEffect,
  DotScreenEffectParams,
  DotScreenVideoEffect,
  HueSaturationEffectParams,
  HueSaturationVideoEffect,
  NoiseEffectParams,
  NoiseVideoEffect,
  PixelationEffectParams,
  PixelationVideoEffect,
  ScanlineEffectParams,
  ScanlineVideoEffect,
  SepiaEffectParams,
  SepiaVideoEffect,
  VideoEffect,
  VideoEffectParams,
  VideoEffectType,
  VignetteEffectParams,
  VignetteVideoEffect,
} from "../types/video-effect";
import {
  BLOOM_INTENSITY_MAX,
  BLOOM_INTENSITY_MIN,
  BLOOM_THRESHOLD_MAX,
  BLOOM_THRESHOLD_MIN,
  BLUR_RADIUS_MAX,
  BLUR_RADIUS_MIN,
  CHROMATIC_OFFSET_MAX,
  CHROMATIC_OFFSET_MIN,
  COLOR_GRADE_BRIGHTNESS_MAX,
  COLOR_GRADE_BRIGHTNESS_MIN,
  COLOR_GRADE_CONTRAST_MAX,
  COLOR_GRADE_CONTRAST_MIN,
  COLOR_GRADE_SATURATION_MAX,
  COLOR_GRADE_SATURATION_MIN,
  DOT_SCREEN_ANGLE_MAX,
  DOT_SCREEN_ANGLE_MIN,
  DOT_SCREEN_SCALE_MAX,
  DOT_SCREEN_SCALE_MIN,
  HUE_MAX,
  HUE_MIN,
  HUE_SATURATION_SHIFT_MAX,
  HUE_SATURATION_SHIFT_MIN,
  PIXELATION_GRANULARITY_MAX,
  PIXELATION_GRANULARITY_MIN,
  SCANLINE_DENSITY_MAX,
  SCANLINE_DENSITY_MIN,
  VIDEO_EFFECT_TYPES,
  VIGNETTE_DARKNESS_MAX,
  VIGNETTE_DARKNESS_MIN,
  VIGNETTE_OFFSET_MAX,
  VIGNETTE_OFFSET_MIN,
} from "../types/video-effect";
import { randomId } from "./random-id";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export { VIDEO_EFFECT_TYPES };

export function normalizeColorGradeParams(
  params: Partial<ColorGradeEffectParams> | undefined,
): ColorGradeEffectParams {
  return {
    brightness: Math.max(
      COLOR_GRADE_BRIGHTNESS_MIN,
      Math.min(COLOR_GRADE_BRIGHTNESS_MAX, params?.brightness ?? 0),
    ),
    contrast: Math.max(
      COLOR_GRADE_CONTRAST_MIN,
      Math.min(COLOR_GRADE_CONTRAST_MAX, params?.contrast ?? 1),
    ),
    saturation: Math.max(
      COLOR_GRADE_SATURATION_MIN,
      Math.min(COLOR_GRADE_SATURATION_MAX, params?.saturation ?? 1),
    ),
  };
}

export function normalizeBlurParams(
  params: Partial<BlurEffectParams> | undefined,
): BlurEffectParams {
  return {
    radius: Math.max(BLUR_RADIUS_MIN, Math.min(BLUR_RADIUS_MAX, params?.radius ?? 4)),
    mix: clamp01(params?.mix ?? 0.5),
  };
}

export function normalizeVignetteParams(
  params: Partial<VignetteEffectParams> | undefined,
): VignetteEffectParams {
  return {
    offset: Math.max(VIGNETTE_OFFSET_MIN, Math.min(VIGNETTE_OFFSET_MAX, params?.offset ?? 0.5)),
    darkness: Math.max(
      VIGNETTE_DARKNESS_MIN,
      Math.min(VIGNETTE_DARKNESS_MAX, params?.darkness ?? 0.5),
    ),
  };
}

export function normalizeBloomParams(
  params: Partial<BloomEffectParams> | undefined,
): BloomEffectParams {
  return {
    intensity: Math.max(
      BLOOM_INTENSITY_MIN,
      Math.min(BLOOM_INTENSITY_MAX, params?.intensity ?? 0.75),
    ),
    threshold: Math.max(
      BLOOM_THRESHOLD_MIN,
      Math.min(BLOOM_THRESHOLD_MAX, params?.threshold ?? 0.65),
    ),
  };
}

export function normalizeNoiseParams(
  params: Partial<NoiseEffectParams> | undefined,
): NoiseEffectParams {
  return { mix: clamp01(params?.mix ?? 0.15) };
}

export function normalizeSepiaParams(
  params: Partial<SepiaEffectParams> | undefined,
): SepiaEffectParams {
  return { mix: clamp01(params?.mix ?? 0.5) };
}

export function normalizeChromaticAberrationParams(
  params: Partial<ChromaticAberrationEffectParams> | undefined,
): ChromaticAberrationEffectParams {
  return {
    offset: Math.max(CHROMATIC_OFFSET_MIN, Math.min(CHROMATIC_OFFSET_MAX, params?.offset ?? 0.35)),
    mix: clamp01(params?.mix ?? 0.75),
  };
}

export function normalizeHueSaturationParams(
  params: Partial<HueSaturationEffectParams> | undefined,
): HueSaturationEffectParams {
  return {
    hue: Math.max(HUE_MIN, Math.min(HUE_MAX, params?.hue ?? 0)),
    saturation: Math.max(
      HUE_SATURATION_SHIFT_MIN,
      Math.min(HUE_SATURATION_SHIFT_MAX, params?.saturation ?? 0),
    ),
  };
}

export function normalizePixelationParams(
  params: Partial<PixelationEffectParams> | undefined,
): PixelationEffectParams {
  return {
    granularity: Math.max(
      PIXELATION_GRANULARITY_MIN,
      Math.min(PIXELATION_GRANULARITY_MAX, params?.granularity ?? 12),
    ),
    mix: clamp01(params?.mix ?? 0.75),
  };
}

export function normalizeScanlineParams(
  params: Partial<ScanlineEffectParams> | undefined,
): ScanlineEffectParams {
  return {
    density: Math.max(
      SCANLINE_DENSITY_MIN,
      Math.min(SCANLINE_DENSITY_MAX, params?.density ?? 1.25),
    ),
    mix: clamp01(params?.mix ?? 0.35),
  };
}

export function normalizeDotScreenParams(
  params: Partial<DotScreenEffectParams> | undefined,
): DotScreenEffectParams {
  return {
    scale: Math.max(DOT_SCREEN_SCALE_MIN, Math.min(DOT_SCREEN_SCALE_MAX, params?.scale ?? 1)),
    angle: Math.max(DOT_SCREEN_ANGLE_MIN, Math.min(DOT_SCREEN_ANGLE_MAX, params?.angle ?? 45)),
    mix: clamp01(params?.mix ?? 0.75),
  };
}

export function defaultColorGradeEffect(): ColorGradeVideoEffect {
  return {
    id: randomId(),
    type: "colorGrade",
    enabled: true,
    params: normalizeColorGradeParams(undefined),
  };
}

export function defaultBlurEffect(): BlurVideoEffect {
  return {
    id: randomId(),
    type: "blur",
    enabled: true,
    params: normalizeBlurParams(undefined),
  };
}

export function defaultVignetteEffect(): VignetteVideoEffect {
  return {
    id: randomId(),
    type: "vignette",
    enabled: true,
    params: normalizeVignetteParams(undefined),
  };
}

export function defaultBloomEffect(): BloomVideoEffect {
  return {
    id: randomId(),
    type: "bloom",
    enabled: true,
    params: normalizeBloomParams(undefined),
  };
}

export function defaultNoiseEffect(): NoiseVideoEffect {
  return {
    id: randomId(),
    type: "noise",
    enabled: true,
    params: normalizeNoiseParams(undefined),
  };
}

export function defaultSepiaEffect(): SepiaVideoEffect {
  return {
    id: randomId(),
    type: "sepia",
    enabled: true,
    params: normalizeSepiaParams(undefined),
  };
}

export function defaultChromaticAberrationEffect(): ChromaticAberrationVideoEffect {
  return {
    id: randomId(),
    type: "chromaticAberration",
    enabled: true,
    params: normalizeChromaticAberrationParams(undefined),
  };
}

export function defaultHueSaturationEffect(): HueSaturationVideoEffect {
  return {
    id: randomId(),
    type: "hueSaturation",
    enabled: true,
    params: normalizeHueSaturationParams(undefined),
  };
}

export function defaultPixelationEffect(): PixelationVideoEffect {
  return {
    id: randomId(),
    type: "pixelation",
    enabled: true,
    params: normalizePixelationParams(undefined),
  };
}

export function defaultScanlineEffect(): ScanlineVideoEffect {
  return {
    id: randomId(),
    type: "scanline",
    enabled: true,
    params: normalizeScanlineParams(undefined),
  };
}

export function defaultDotScreenEffect(): DotScreenVideoEffect {
  return {
    id: randomId(),
    type: "dotScreen",
    enabled: true,
    params: normalizeDotScreenParams(undefined),
  };
}

export function createDefaultVideoBusEffect(type: VideoEffectType): VideoEffect {
  switch (type) {
    case "colorGrade":
      return defaultColorGradeEffect();
    case "blur":
      return defaultBlurEffect();
    case "vignette":
      return defaultVignetteEffect();
    case "bloom":
      return defaultBloomEffect();
    case "noise":
      return defaultNoiseEffect();
    case "sepia":
      return defaultSepiaEffect();
    case "chromaticAberration":
      return defaultChromaticAberrationEffect();
    case "hueSaturation":
      return defaultHueSaturationEffect();
    case "pixelation":
      return defaultPixelationEffect();
    case "scanline":
      return defaultScanlineEffect();
    case "dotScreen":
      return defaultDotScreenEffect();
  }
}

export function normalizeVideoEffect(raw: VideoEffect): VideoEffect;
export function normalizeVideoEffect(
  raw: Partial<VideoEffect> & Pick<VideoEffect, "id">,
): VideoEffect;
export function normalizeVideoEffect(
  raw: Partial<VideoEffect> & Pick<VideoEffect, "id">,
): VideoEffect {
  switch (raw.type) {
    case "blur":
      return {
        id: raw.id,
        type: "blur",
        enabled: raw.enabled !== false,
        params: normalizeBlurParams(raw.params as Partial<BlurEffectParams> | undefined),
      };
    case "vignette":
      return {
        id: raw.id,
        type: "vignette",
        enabled: raw.enabled !== false,
        params: normalizeVignetteParams(raw.params as Partial<VignetteEffectParams> | undefined),
      };
    case "bloom":
      return {
        id: raw.id,
        type: "bloom",
        enabled: raw.enabled !== false,
        params: normalizeBloomParams(raw.params as Partial<BloomEffectParams> | undefined),
      };
    case "noise":
      return {
        id: raw.id,
        type: "noise",
        enabled: raw.enabled !== false,
        params: normalizeNoiseParams(raw.params as Partial<NoiseEffectParams> | undefined),
      };
    case "sepia":
      return {
        id: raw.id,
        type: "sepia",
        enabled: raw.enabled !== false,
        params: normalizeSepiaParams(raw.params as Partial<SepiaEffectParams> | undefined),
      };
    case "chromaticAberration":
      return {
        id: raw.id,
        type: "chromaticAberration",
        enabled: raw.enabled !== false,
        params: normalizeChromaticAberrationParams(
          raw.params as Partial<ChromaticAberrationEffectParams> | undefined,
        ),
      };
    case "hueSaturation":
      return {
        id: raw.id,
        type: "hueSaturation",
        enabled: raw.enabled !== false,
        params: normalizeHueSaturationParams(
          raw.params as Partial<HueSaturationEffectParams> | undefined,
        ),
      };
    case "pixelation":
      return {
        id: raw.id,
        type: "pixelation",
        enabled: raw.enabled !== false,
        params: normalizePixelationParams(
          raw.params as Partial<PixelationEffectParams> | undefined,
        ),
      };
    case "scanline":
      return {
        id: raw.id,
        type: "scanline",
        enabled: raw.enabled !== false,
        params: normalizeScanlineParams(raw.params as Partial<ScanlineEffectParams> | undefined),
      };
    case "dotScreen":
      return {
        id: raw.id,
        type: "dotScreen",
        enabled: raw.enabled !== false,
        params: normalizeDotScreenParams(raw.params as Partial<DotScreenEffectParams> | undefined),
      };
    case "colorGrade":
    default:
      return {
        id: raw.id,
        type: "colorGrade",
        enabled: raw.enabled !== false,
        params: normalizeColorGradeParams(
          raw.params as Partial<ColorGradeEffectParams> | undefined,
        ),
      };
  }
}

export function normalizeVideoEffects(effects: VideoEffect[] | undefined): VideoEffect[] {
  if (!effects?.length) return [];
  return effects.map((effect) => normalizeVideoEffect(effect));
}

export function busHasVideoEffectType(
  bus: { effects?: VideoEffect[] },
  type: VideoEffectType,
): boolean {
  return bus.effects?.some((effect) => effect.type === type) ?? false;
}

export function reorderVideoEffects(
  effects: VideoEffect[],
  draggedId: string,
  targetId: string,
  place: "before" | "after",
): VideoEffect[] | null {
  if (draggedId === targetId) return null;
  const fromIndex = effects.findIndex((effect) => effect.id === draggedId);
  if (fromIndex === -1 || !effects.some((effect) => effect.id === targetId)) return null;

  const next = [...effects];
  const [moved] = next.splice(fromIndex, 1);
  const targetIndex = next.findIndex((effect) => effect.id === targetId);
  const insertAt = place === "after" ? targetIndex + 1 : targetIndex;
  next.splice(insertAt, 0, moved);

  const unchanged = next.every((effect, index) => effect.id === effects[index]?.id);
  return unchanged ? null : next;
}

export function mergeVideoEffectParams(
  effect: VideoEffect,
  patch: Partial<VideoEffectParams> | undefined,
): VideoEffect["params"] {
  if (!patch) return effect.params;
  switch (effect.type) {
    case "blur":
      return normalizeBlurParams({ ...effect.params, ...patch });
    case "vignette":
      return normalizeVignetteParams({ ...effect.params, ...patch });
    case "bloom":
      return normalizeBloomParams({ ...effect.params, ...patch });
    case "noise":
      return normalizeNoiseParams({ ...effect.params, ...patch });
    case "sepia":
      return normalizeSepiaParams({ ...effect.params, ...patch });
    case "chromaticAberration":
      return normalizeChromaticAberrationParams({ ...effect.params, ...patch });
    case "hueSaturation":
      return normalizeHueSaturationParams({ ...effect.params, ...patch });
    case "pixelation":
      return normalizePixelationParams({ ...effect.params, ...patch });
    case "scanline":
      return normalizeScanlineParams({ ...effect.params, ...patch });
    case "dotScreen":
      return normalizeDotScreenParams({ ...effect.params, ...patch });
    case "colorGrade":
      return normalizeColorGradeParams({ ...effect.params, ...patch });
  }
}

export function patchVideoBusEffect(
  effect: VideoEffect,
  patch: { params?: Partial<VideoEffectParams>; enabled?: boolean },
): VideoEffect {
  const enabled = patch.enabled ?? effect.enabled;
  if (!patch.params) {
    return normalizeVideoEffect({ ...effect, enabled });
  }
  const params = mergeVideoEffectParams(effect, patch.params);
  return normalizeVideoEffect({ ...effect, enabled, params } as VideoEffect);
}

export function videoEffectChainKey(effects: VideoEffect[] | undefined): string {
  if (!effects?.length) return "";
  return effects.map((effect) => `${effect.id}:${effect.type}`).join("|");
}

export function videoEffectsEqual(
  a: VideoEffect[] | undefined,
  b: VideoEffect[] | undefined,
): boolean {
  const left = normalizeVideoEffects(a);
  const right = normalizeVideoEffects(b);
  if (left.length !== right.length) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}
