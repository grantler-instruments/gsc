import { Effect } from "postprocessing";
import { Uniform, Vector3 } from "three";
import {
  computeVideoOutputFrameWarpMatrices,
  normalizeVideoOutputFrame,
} from "../../../lib/video-output-frame";
import type { VideoOutputFrame } from "../../../types/video-output-frame";

const FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uDestToUnit0;
uniform vec3 uDestToUnit1;
uniform vec3 uDestToUnit2;
uniform vec3 uUnitToCrop0;
uniform vec3 uUnitToCrop1;
uniform vec3 uUnitToCrop2;

vec2 applyRows(vec3 r0, vec3 r1, vec3 r2, vec2 p) {
  float d = r2.x * p.x + r2.y * p.y + r2.z;
  return vec2(
    (r0.x * p.x + r0.y * p.y + r0.z) / d,
    (r1.x * p.x + r1.y * p.y + r1.z) / d
  );
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 unit = applyRows(uDestToUnit0, uDestToUnit1, uDestToUnit2, uv);
  if (unit.x < 0.0 || unit.x > 1.0 || unit.y < 0.0 || unit.y > 1.0) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec2 srcUv = applyRows(uUnitToCrop0, uUnitToCrop1, uUnitToCrop2, unit);
  if (srcUv.x < 0.0 || srcUv.x > 1.0 || srcUv.y < 0.0 || srcUv.y > 1.0) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  outputColor = texture2D(inputBuffer, srcUv);
}
`;

function rowsFromHomography(matrix: Float32Array): [Vector3, Vector3, Vector3] {
  return [
    new Vector3(matrix[0], matrix[1], matrix[2]),
    new Vector3(matrix[3], matrix[4], matrix[5]),
    new Vector3(matrix[6], matrix[7], matrix[8]),
  ];
}

/** Perspective warp from crop quad to dest quad on the output canvas. */
export class OutputFrameEffect extends Effect {
  private readonly destToUnitRows: [Vector3, Vector3, Vector3];
  private readonly unitToCropRows: [Vector3, Vector3, Vector3];

  constructor(frame?: VideoOutputFrame) {
    const destToUnitRows = rowsFromHomography(new Float32Array(9));
    const unitToCropRows = rowsFromHomography(new Float32Array(9));
    super("OutputFrameEffect", FRAGMENT_SHADER, {
      uniforms: new Map<string, Uniform>([
        ["uDestToUnit0", new Uniform(destToUnitRows[0])],
        ["uDestToUnit1", new Uniform(destToUnitRows[1])],
        ["uDestToUnit2", new Uniform(destToUnitRows[2])],
        ["uUnitToCrop0", new Uniform(unitToCropRows[0])],
        ["uUnitToCrop1", new Uniform(unitToCropRows[1])],
        ["uUnitToCrop2", new Uniform(unitToCropRows[2])],
      ]),
    });
    this.destToUnitRows = destToUnitRows;
    this.unitToCropRows = unitToCropRows;
    this.apply(frame);
  }

  apply(frame?: VideoOutputFrame): void {
    const normalized = normalizeVideoOutputFrame(frame);
    const { destToUnit, unitToCrop } = computeVideoOutputFrameWarpMatrices(normalized);
    this.setRows(this.destToUnitRows, destToUnit);
    this.setRows(this.unitToCropRows, unitToCrop);
  }

  private setRows(rows: [Vector3, Vector3, Vector3], matrix: Float32Array): void {
    rows[0].set(matrix[0], matrix[1], matrix[2]);
    rows[1].set(matrix[3], matrix[4], matrix[5]);
    rows[2].set(matrix[6], matrix[7], matrix[8]);
  }
}
