import { BlendFunction, Effect } from "postprocessing";
import { Uniform } from "three";

const FRAGMENT_SHADER = /* glsl */ `
uniform float opacity;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = vec4(inputColor.rgb, inputColor.a * opacity);
}
`;

/** Master dimmer applied after the bus effect chain. */
export class BusOpacityEffect extends Effect {
  constructor(opacity = 1) {
    super("BusOpacityEffect", FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([["opacity", new Uniform(opacity)]]),
    });
  }

  get opacity(): number {
    return this.uniforms.get("opacity")!.value as number;
  }

  set opacity(value: number) {
    this.uniforms.get("opacity")!.value = Math.max(0, Math.min(1, value));
  }
}
