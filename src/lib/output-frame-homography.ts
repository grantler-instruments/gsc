/** 3×3 homography utilities for output-frame corner pinning. */

export type Point2 = readonly [number, number];

/** Unit square in GL UV space (tl, tr, br, bl). */
export const UNIT_SQUARE_GL: readonly [Point2, Point2, Point2, Point2] = [
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];

/** Homography mapping `from` points to `to` points (row-major, h33 = 1). */
export function homographyFromCorrespondences(
  from: readonly [Point2, Point2, Point2, Point2],
  to: readonly [Point2, Point2, Point2, Point2],
): Float32Array {
  const a: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i += 1) {
    const [x, y] = from[i];
    const [xp, yp] = to[i];
    a.push([x, y, 1, 0, 0, 0, -x * xp, -y * xp]);
    b.push(xp);
    a.push([0, 0, 0, x, y, 1, -x * yp, -y * yp]);
    b.push(yp);
  }

  const h = solveLinearSystem(a, b);
  return new Float32Array([h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]);
}

export function invertHomography3(h: Float32Array): Float32Array {
  const a = h[0];
  const b = h[1];
  const c = h[2];
  const d = h[3];
  const e = h[4];
  const f = h[5];
  const g = h[6];
  const hh = h[7];
  const i = h[8];

  const A = e * i - f * hh;
  const B = -(d * i - f * g);
  const C = d * hh - e * g;
  const D = -(b * i - c * hh);
  const E = a * i - c * g;
  const F = -(a * hh - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-10) {
    return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }

  const invDet = 1 / det;
  return new Float32Array([
    A * invDet,
    D * invDet,
    G * invDet,
    B * invDet,
    E * invDet,
    H * invDet,
    C * invDet,
    F * invDet,
    I * invDet,
  ]);
}

export function multiplyHomography3(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(9);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      out[row * 3 + col] =
        a[row * 3 + 0] * b[0 * 3 + col] +
        a[row * 3 + 1] * b[1 * 3 + col] +
        a[row * 3 + 2] * b[2 * 3 + col];
    }
  }
  return out;
}

/** Map output GL UV through dest quad → unit square → crop quad (source GL UV). */
export function computeOutputFrameHomography(
  destGl: readonly [Point2, Point2, Point2, Point2],
  cropGl: readonly [Point2, Point2, Point2, Point2],
): Float32Array {
  const destFromUnit = homographyFromCorrespondences(UNIT_SQUARE_GL, destGl);
  const unitFromDest = invertHomography3(destFromUnit);
  const cropFromUnit = homographyFromCorrespondences(UNIT_SQUARE_GL, cropGl);
  return multiplyHomography3(cropFromUnit, unitFromDest);
}

function solveLinearSystem(matrix: number[][], values: number[]): number[] {
  const n = values.length;
  const aug = matrix.map((row, index) => [...row, values[index]]);

  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    let pivotAbs = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row += 1) {
      const abs = Math.abs(aug[row][col]);
      if (abs > pivotAbs) {
        pivotAbs = abs;
        pivotRow = row;
      }
    }
    if (pivotAbs < 1e-12) {
      throw new Error("Singular homography system");
    }
    if (pivotRow !== col) {
      [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
    }

    const pivot = aug[col][col];
    for (let j = col; j <= n; j += 1) {
      aug[col][j] /= pivot;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j <= n; j += 1) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  return aug.map((row) => row[n]);
}
