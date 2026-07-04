import type { NormalizedRect, VideoOutputFrame } from "../types/video-output-frame";
import { OUTPUT_FRAME_MIN_SIZE } from "../types/video-output-frame";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
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

export function defaultVideoOutputFrame(): VideoOutputFrame {
  return {
    crop: defaultNormalizedRect(),
    dest: defaultNormalizedRect(),
  };
}

export function normalizeVideoOutputFrame(
  frame: Partial<VideoOutputFrame> | undefined,
): VideoOutputFrame {
  return {
    crop: normalizeNormalizedRect(frame?.crop),
    dest: normalizeNormalizedRect(frame?.dest),
  };
}

export function isIdentityVideoOutputFrame(frame: VideoOutputFrame | undefined): boolean {
  if (!frame) return true;
  const normalized = normalizeVideoOutputFrame(frame);
  const full = defaultNormalizedRect();
  return (
    normalized.crop.x === full.x &&
    normalized.crop.y === full.y &&
    normalized.crop.w === full.w &&
    normalized.crop.h === full.h &&
    normalized.dest.x === full.x &&
    normalized.dest.y === full.y &&
    normalized.dest.w === full.w &&
    normalized.dest.h === full.h
  );
}

export function videoOutputFramesEqual(
  a: VideoOutputFrame | undefined,
  b: VideoOutputFrame | undefined,
): boolean {
  const left = normalizeVideoOutputFrame(a);
  const right = normalizeVideoOutputFrame(b);
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Convert top-left rects to bottom-left GL UV space for the output-frame shader. */
export function normalizedRectToGlUniform(rect: NormalizedRect): [number, number, number, number] {
  return [rect.x, 1 - rect.y - rect.h, rect.w, rect.h];
}

/** Omit from snapshots when still the default full-frame mapping. */
export function serializeVideoOutputFrame(
  frame: VideoOutputFrame | undefined,
): VideoOutputFrame | undefined {
  const normalized = normalizeVideoOutputFrame(frame);
  return isIdentityVideoOutputFrame(normalized) ? undefined : normalized;
}
