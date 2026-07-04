import { BlendFunction, HueSaturationEffect as PostHueSaturationEffect } from "postprocessing";
import { normalizeHueSaturationParams } from "../../../lib/video-effects";
import type { HueSaturationVideoEffect } from "../../../types/video-effect";

export class HueSaturationEffect extends PostHueSaturationEffect {
  constructor(effect: HueSaturationVideoEffect) {
    super({ blendFunction: BlendFunction.NORMAL });
    this.apply(effect);
  }

  apply(effect: HueSaturationVideoEffect): void {
    const params = normalizeHueSaturationParams(effect.params);
    this.hue = params.hue * Math.PI;
    this.saturation = params.saturation;
  }
}
