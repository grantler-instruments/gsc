import { BlendFunction, Effect } from "postprocessing";
import { Uniform, Vector4 } from "three";
import {
  normalizedRectToGlUniform,
  normalizeVideoOutputFrame,
} from "../../../lib/video-output-frame";
import type { VideoOutputFrame } from "../../../types/video-output-frame";

const FRAGMENT_SHADER = /* glsl */ `
uniform vec4 uCrop;
uniform vec4 uDest;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (
    uv.x < uDest.x ||
    uv.x > uDest.x + uDest.z ||
    uv.y < uDest.y ||
    uv.y > uDest.y + uDest.w
  ) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec2 local = vec2(
    (uv.x - uDest.x) / uDest.z,
    (uv.y - uDest.y) / uDest.w
  );
  vec2 srcUv = vec2(
    uCrop.x + local.x * uCrop.z,
    uCrop.y + local.y * uCrop.w
  );
  outputColor = texture2D(inputBuffer, srcUv);
}
`;

/** Crops the composited bus and draws it into a destination rectangle. */
export class OutputFrameEffect extends Effect {
  private readonly cropUniform: Vector4;
  private readonly destUniform: Vector4;

  constructor(frame?: VideoOutputFrame) {
    const cropUniform = new Vector4();
    const destUniform = new Vector4();
    super("OutputFrameEffect", FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform<Vector4>>([
        ["uCrop", new Uniform(cropUniform)],
        ["uDest", new Uniform(destUniform)],
      ]),
    });
    this.cropUniform = cropUniform;
    this.destUniform = destUniform;
    this.apply(frame);
  }

  apply(frame?: VideoOutputFrame): void {
    const normalized = normalizeVideoOutputFrame(frame);
    this.cropUniform.fromArray(normalizedRectToGlUniform(normalized.crop));
    this.destUniform.fromArray(normalizedRectToGlUniform(normalized.dest));
  }
}
