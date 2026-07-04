import type {
  NormalizedPoint,
  NormalizedQuad,
  NormalizedRect,
  QuadCorner,
  VideoOutputFrame,
} from "../types/video-output-frame";
import { OUTPUT_FRAME_MIN_SIZE } from "../types/video-output-frame";
import type { Point2 } from "./output-frame-homography";
import {
  computeOutputFrameHomography,
  homographyFromCorrespondences,
  invertHomography3,
  UNIT_SQUARE_GL,
} from "./output-frame-homography";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function defaultNormalizedPoint(): NormalizedPoint {
  return { x: 0, y: 0 };
}

export function normalizeNormalizedPoint(
  point: Partial<NormalizedPoint> | undefined,
): NormalizedPoint {
  return {
    x: clamp01(point?.x ?? 0),
    y: clamp01(point?.y ?? 0),
  };
}

export function defaultNormalizedRect(): NormalizedRect {
  return { x: 0, y: 0, w: 1, h: 1 };
}

export function normalizeNormalizedRect(rect: Partial<NormalizedRect> | undefined): NormalizedRect {
  const w = Math.max(OUTPUT_FRAME_MIN_SIZE, clamp01(rect?.w ?? 1));
  const h = Math.max(OUTPUT_FRAME_MIN_SIZE, clamp01(rect?.h ?? 1));
  const x = clamp01(rect?.x ?? 0);
  const y = clamp01(rect?.y ?? 0);
  return {
    x: Math.min(x, 1 - w),
    y: Math.min(y, 1 - h),
    w,
    h,
  };
}

export function defaultNormalizedQuad(): NormalizedQuad {
  return {
    tl: { x: 0, y: 0 },
    tr: { x: 1, y: 0 },
    br: { x: 1, y: 1 },
    bl: { x: 0, y: 1 },
  };
}

export function rectToQuad(rect: NormalizedRect): NormalizedQuad {
  return {
    tl: { x: rect.x, y: rect.y },
    tr: { x: rect.x + rect.w, y: rect.y },
    br: { x: rect.x + rect.w, y: rect.y + rect.h },
    bl: { x: rect.x, y: rect.y + rect.h },
  };
}

export function quadToBoundingRect(quad: NormalizedQuad): NormalizedRect {
  const xs = [quad.tl.x, quad.tr.x, quad.br.x, quad.bl.x];
  const ys = [quad.tl.y, quad.tr.y, quad.br.y, quad.bl.y];
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return normalizeNormalizedRect({
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  });
}

function isLegacyRect(value: unknown): value is NormalizedRect {
  return (
    typeof value === "object" && value !== null && "w" in value && "h" in value && !("tl" in value)
  );
}

function normalizeLegacyQuad(value: unknown): NormalizedQuad {
  if (isLegacyRect(value)) {
    return rectToQuad(normalizeNormalizedRect(value));
  }

  const partial = value as Partial<NormalizedQuad> | undefined;
  const full = defaultNormalizedQuad();
  return {
    tl: normalizeNormalizedPoint(partial?.tl ?? full.tl),
    tr: normalizeNormalizedPoint(partial?.tr ?? full.tr),
    br: normalizeNormalizedPoint(partial?.br ?? full.br),
    bl: normalizeNormalizedPoint(partial?.bl ?? full.bl),
  };
}

export function normalizeNormalizedQuad(
  quad: Partial<NormalizedQuad> | NormalizedRect | undefined,
): NormalizedQuad {
  return normalizeLegacyQuad(quad);
}

export function defaultVideoOutputFrame(): VideoOutputFrame {
  return {
    crop: defaultNormalizedQuad(),
    dest: defaultNormalizedQuad(),
  };
}

export function normalizeVideoOutputFrame(
  frame:
    | Partial<VideoOutputFrame>
    | { crop?: NormalizedRect | NormalizedQuad; dest?: NormalizedRect | NormalizedQuad }
    | undefined,
): VideoOutputFrame {
  return {
    crop: normalizeNormalizedQuad(frame?.crop as NormalizedRect | NormalizedQuad | undefined),
    dest: normalizeNormalizedQuad(frame?.dest as NormalizedRect | NormalizedQuad | undefined),
  };
}

function quadsEqual(a: NormalizedQuad, b: NormalizedQuad, epsilon = 1e-4): boolean {
  const corners: QuadCorner[] = ["tl", "tr", "br", "bl"];
  return corners.every(
    (corner) =>
      Math.abs(a[corner].x - b[corner].x) <= epsilon &&
      Math.abs(a[corner].y - b[corner].y) <= epsilon,
  );
}

export function isAxisAlignedQuad(quad: NormalizedQuad, epsilon = 1e-4): boolean {
  const aligned = rectToQuad(quadToBoundingRect(quad));
  return quadsEqual(quad, aligned, epsilon);
}

export function isIdentityVideoOutputFrame(frame: VideoOutputFrame | undefined): boolean {
  if (!frame) return true;
  const normalized = normalizeVideoOutputFrame(frame);
  const full = defaultNormalizedQuad();
  return quadsEqual(normalized.crop, full) && quadsEqual(normalized.dest, full);
}

export function videoOutputFramesEqual(
  a: VideoOutputFrame | undefined,
  b: VideoOutputFrame | undefined,
): boolean {
  const left = normalizeVideoOutputFrame(a);
  const right = normalizeVideoOutputFrame(b);
  return quadsEqual(left.crop, right.crop) && quadsEqual(left.dest, right.dest);
}

/** Convert top-left normalized quad corners to GL UV space (tl, tr, br, bl). */
export function normalizedQuadToGlPoints(quad: NormalizedQuad): [Point2, Point2, Point2, Point2] {
  return [
    [quad.tl.x, 1 - quad.tl.y],
    [quad.tr.x, 1 - quad.tr.y],
    [quad.br.x, 1 - quad.br.y],
    [quad.bl.x, 1 - quad.bl.y],
  ];
}

/** Row-major 3×3 homography: output GL UV → source GL UV. */
export function computeVideoOutputFrameHomography(
  frame: VideoOutputFrame | undefined,
): Float32Array {
  const normalized = normalizeVideoOutputFrame(frame);
  return computeOutputFrameHomography(
    normalizedQuadToGlPoints(normalized.dest),
    normalizedQuadToGlPoints(normalized.crop),
  );
}

export function computeVideoOutputFrameWarpMatrices(frame: VideoOutputFrame | undefined): {
  destToUnit: Float32Array;
  unitToCrop: Float32Array;
} {
  const normalized = normalizeVideoOutputFrame(frame);
  const destGl = normalizedQuadToGlPoints(normalized.dest);
  const cropGl = normalizedQuadToGlPoints(normalized.crop);
  const destFromUnit = homographyFromCorrespondences(UNIT_SQUARE_GL, destGl);
  return {
    destToUnit: invertHomography3(destFromUnit),
    unitToCrop: homographyFromCorrespondences(UNIT_SQUARE_GL, cropGl),
  };
}

/** @deprecated Use {@link normalizedQuadToGlPoints}. */
export function normalizedRectToGlUniform(rect: NormalizedRect): [number, number, number, number] {
  return [rect.x, 1 - rect.y - rect.h, rect.w, rect.h];
}

export function patchNormalizedQuadCorner(
  quad: NormalizedQuad,
  corner: QuadCorner,
  point: NormalizedPoint,
): NormalizedQuad {
  return normalizeNormalizedQuad({
    ...quad,
    [corner]: normalizeNormalizedPoint(point),
  });
}

export function patchNormalizedQuadFromRect(
  _quad: NormalizedQuad,
  rect: NormalizedRect,
): NormalizedQuad {
  return rectToQuad(normalizeNormalizedRect(rect));
}

export function translateNormalizedQuad(
  quad: NormalizedQuad,
  dx: number,
  dy: number,
): NormalizedQuad {
  const corners: QuadCorner[] = ["tl", "tr", "br", "bl"];
  const next: Partial<NormalizedQuad> = {};
  for (const corner of corners) {
    next[corner] = {
      x: clamp01(quad[corner].x + dx),
      y: clamp01(quad[corner].y + dy),
    };
  }
  return normalizeNormalizedQuad(next);
}

export function applyLinkedDestQuadSize(
  frame: VideoOutputFrame,
  linkDestSize: boolean,
): VideoOutputFrame {
  if (!linkDestSize) return frame;
  const normalized = normalizeVideoOutputFrame(frame);
  if (isAxisAlignedQuad(normalized.crop) && isAxisAlignedQuad(normalized.dest)) {
    const cropRect = quadToBoundingRect(normalized.crop);
    const destRect = quadToBoundingRect(normalized.dest);
    return normalizeVideoOutputFrame({
      ...normalized,
      dest: rectToQuad(
        normalizeNormalizedRect({
          x: destRect.x,
          y: destRect.y,
          w: cropRect.w,
          h: cropRect.h,
        }),
      ),
    });
  }
  return normalizeVideoOutputFrame({
    ...normalized,
    dest: normalized.crop,
  });
}

/** Omit from snapshots when still the default full-frame mapping. */
export function serializeVideoOutputFrame(
  frame: VideoOutputFrame | undefined,
): VideoOutputFrame | undefined {
  const normalized = normalizeVideoOutputFrame(frame);
  return isIdentityVideoOutputFrame(normalized) ? undefined : normalized;
}
