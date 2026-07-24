import { BlendFunction, Effect } from "postprocessing";
import { type Uniform as ThreeUniform, Uniform, Vector2 } from "three";
import { normalizeBlurParams } from "../../../lib/video-effects";
import type { BlurVideoEffect } from "../../../types/video-effect";

const FRAGMENT_SHADER = /* glsl */ `
uniform float radius;
uniform float mixAmount;
uniform vec2 texelSize;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 sum = inputColor * 0.227027;
  vec2 stepX = vec2(texelSize.x * radius, 0.0);
  vec2 stepY = vec2(0.0, texelSize.y * radius);

  sum += texture(inputBuffer, uv + stepX) * 0.1945946;
  sum += texture(inputBuffer, uv - stepX) * 0.1945946;
  sum += texture(inputBuffer, uv + stepY) * 0.1945946;
  sum += texture(inputBuffer, uv - stepY) * 0.1945946;
  sum += texture(inputBuffer, uv + stepX + stepY) * 0.1216216;
  sum += texture(inputBuffer, uv - stepX - stepY) * 0.1216216;
  sum += texture(inputBuffer, uv + stepX - stepY) * 0.054054;
  sum += texture(inputBuffer, uv - stepX + stepY) * 0.054054;

  outputColor = mix(inputColor, sum, mixAmount);
}
`;

export class BlurEffect extends Effect {
  private readonly texelSize: Vector2;

  constructor(effect: BlurVideoEffect, width: number, height: number) {
    const params = normalizeBlurParams(effect.params);
    const texelSize = new Vector2(1 / Math.max(1, width), 1 / Math.max(1, height));
    super("BlurEffect", FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, ThreeUniform<number | Vector2>>([
        ["radius", new Uniform(params.radius)],
        ["mixAmount", new Uniform(params.mix)],
        ["texelSize", new Uniform(texelSize)],
      ]),
    });
    this.texelSize = texelSize;
  }

  resize(width: number, height: number): void {
    this.texelSize.set(1 / Math.max(1, width), 1 / Math.max(1, height));
  }

  apply(effect: BlurVideoEffect): void {
    const params = normalizeBlurParams(effect.params);
    this.uniforms.get("radius")!.value = params.radius;
    this.uniforms.get("mixAmount")!.value = params.mix;
  }
}
