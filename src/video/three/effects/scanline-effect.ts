import { BlendFunction, ScanlineEffect as PostScanlineEffect } from "postprocessing";
import { normalizeScanlineParams } from "../../../lib/video-effects";
import type { ScanlineVideoEffect } from "../../../types/video-effect";

export class ScanlineEffect extends PostScanlineEffect {
  constructor(effect: ScanlineVideoEffect, width: number, height: number) {
    super({ blendFunction: BlendFunction.NORMAL, density: 1.25 });
    this.setSize(width, height);
    this.apply(effect);
  }

  resize(width: number, height: number): void {
    this.setSize(width, height);
  }

  apply(effect: ScanlineVideoEffect): void {
    const params = normalizeScanlineParams(effect.params);
    this.density = params.density;
    this.blendMode.opacity.value = params.mix;
  }
}
