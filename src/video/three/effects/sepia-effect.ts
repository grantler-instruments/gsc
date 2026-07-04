import { BlendFunction, SepiaEffect as PostSepiaEffect } from "postprocessing";
import { normalizeSepiaParams } from "../../../lib/video-effects";
import type { SepiaVideoEffect } from "../../../types/video-effect";

export class SepiaEffect extends PostSepiaEffect {
  constructor(effect: SepiaVideoEffect) {
    super({ blendFunction: BlendFunction.NORMAL });
    this.apply(effect);
  }

  apply(effect: SepiaVideoEffect): void {
    const params = normalizeSepiaParams(effect.params);
    this.blendMode.opacity.value = params.mix;
  }
}
