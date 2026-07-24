import { BlendFunction, Effect } from "postprocessing";
import { Uniform } from "three";
import { normalizeColorGradeParams } from "../../../lib/video-effects";
import type { ColorGradeVideoEffect } from "../../../types/video-effect";

const FRAGMENT_SHADER = /* glsl */ `
uniform float brightness;
uniform float contrast;
uniform float saturation;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 rgb = inputColor.rgb + brightness;
  rgb = (rgb - 0.5) * contrast + 0.5;
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  rgb = mix(vec3(luma), rgb, saturation);
  outputColor = vec4(clamp(rgb, 0.0, 1.0), inputColor.a);
}
`;

export class ColorGradeEffect extends Effect {
  constructor(effect: ColorGradeVideoEffect) {
    const params = normalizeColorGradeParams(effect.params);
    super("ColorGradeEffect", FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ["brightness", new Uniform(params.brightness)],
        ["contrast", new Uniform(params.contrast)],
        ["saturation", new Uniform(params.saturation)],
      ]),
    });
  }

  apply(effect: ColorGradeVideoEffect): void {
    const params = normalizeColorGradeParams(effect.params);
    this.uniforms.get("brightness")!.value = params.brightness;
    this.uniforms.get("contrast")!.value = params.contrast;
    this.uniforms.get("saturation")!.value = params.saturation;
  }
}
