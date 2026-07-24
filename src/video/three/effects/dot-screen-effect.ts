import { BlendFunction, DotScreenEffect as PostDotScreenEffect } from "postprocessing";
import { normalizeDotScreenParams } from "../../../lib/video-effects";
import type { DotScreenVideoEffect } from "../../../types/video-effect";

export class DotScreenEffect extends PostDotScreenEffect {
  constructor(effect: DotScreenVideoEffect) {
    super({ blendFunction: BlendFunction.NORMAL });
    this.apply(effect);
  }

  apply(effect: DotScreenVideoEffect): void {
    const params = normalizeDotScreenParams(effect.params);
    this.scale = params.scale;
    this.angle = (params.angle * Math.PI) / 180;
    this.blendMode.opacity.value = params.mix;
  }
}
