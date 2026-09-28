import { BlendFunction, BloomEffect as PostBloomEffect } from "postprocessing";
import { normalizeBloomParams } from "../../../lib/video-effects";
import type { BloomVideoEffect } from "../../../types/video-effect";

export class BloomEffect extends PostBloomEffect {
  constructor(effect: BloomVideoEffect) {
    const params = normalizeBloomParams(effect.params);
    super({
      blendFunction: BlendFunction.SCREEN,
      intensity: params.intensity,
      luminanceThreshold: params.threshold,
      mipmapBlur: true,
    });
  }

  apply(effect: BloomVideoEffect): void {
    const params = normalizeBloomParams(effect.params);
    this.intensity = params.intensity;
    this.luminanceMaterial.threshold = params.threshold;
  }
}
