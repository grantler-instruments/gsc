import {
  BlendFunction,
  ChromaticAberrationEffect as PostChromaticAberrationEffect,
} from "postprocessing";
import { normalizeChromaticAberrationParams } from "../../../lib/video-effects";
import type { ChromaticAberrationVideoEffect } from "../../../types/video-effect";

const MAX_OFFSET = 0.01;

export class ChromaticAberrationEffect extends PostChromaticAberrationEffect {
  constructor(effect: ChromaticAberrationVideoEffect) {
    super({
      blendFunction: BlendFunction.NORMAL,
      radialModulation: false,
      modulationOffset: 0,
    });
    this.apply(effect);
  }

  apply(effect: ChromaticAberrationVideoEffect): void {
    const params = normalizeChromaticAberrationParams(effect.params);
    const amount = params.offset * MAX_OFFSET;
    this.offset.set(amount, amount);
    this.blendMode.opacity.value = params.mix;
  }
}
