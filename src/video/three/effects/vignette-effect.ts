import { BlendFunction, VignetteEffect as PostVignetteEffect } from "postprocessing";
import { normalizeVignetteParams } from "../../../lib/video-effects";
import type { VignetteVideoEffect } from "../../../types/video-effect";

export class VignetteEffect extends PostVignetteEffect {
  constructor(effect: VignetteVideoEffect) {
    const params = normalizeVignetteParams(effect.params);
    super({
      blendFunction: BlendFunction.NORMAL,
      offset: params.offset,
      darkness: params.darkness,
    });
  }

  apply(effect: VignetteVideoEffect): void {
    const params = normalizeVignetteParams(effect.params);
    this.offset = params.offset;
    this.darkness = params.darkness;
  }
}
