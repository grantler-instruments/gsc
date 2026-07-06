import { BlendFunction, NoiseEffect as PostNoiseEffect } from "postprocessing";
import { normalizeNoiseParams } from "../../../lib/video-effects";
import type { NoiseVideoEffect } from "../../../types/video-effect";

export class NoiseEffect extends PostNoiseEffect {
  constructor(effect: NoiseVideoEffect) {
    super({
      blendFunction: BlendFunction.SCREEN,
      premultiply: false,
    });
    this.apply(effect);
  }

  apply(effect: NoiseVideoEffect): void {
    const params = normalizeNoiseParams(effect.params);
    this.blendMode.opacity.value = params.mix;
  }
}
