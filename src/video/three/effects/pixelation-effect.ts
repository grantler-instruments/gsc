import { PixelationEffect as PostPixelationEffect } from "postprocessing";
import { normalizePixelationParams } from "../../../lib/video-effects";
import type { PixelationVideoEffect } from "../../../types/video-effect";

export class PixelationEffect extends PostPixelationEffect {
  constructor(effect: PixelationVideoEffect, width: number, height: number) {
    super(normalizePixelationParams(effect.params).granularity);
    this.setSize(width, height);
    this.apply(effect);
  }

  resize(width: number, height: number): void {
    this.setSize(width, height);
  }

  apply(effect: PixelationVideoEffect): void {
    const params = normalizePixelationParams(effect.params);
    this.granularity = params.granularity;
    this.blendMode.opacity.value = params.mix;
  }
}
