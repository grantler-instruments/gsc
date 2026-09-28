/** Normalized point in 0–1 canvas space (origin top-left). */
export interface NormalizedPoint {
  x: number;
  y: number;
}

/** Four corners in tl → tr → br → bl order. */
export interface NormalizedQuad {
  tl: NormalizedPoint;
  tr: NormalizedPoint;
  br: NormalizedPoint;
  bl: NormalizedPoint;
}

/** Legacy axis-aligned rect — migrated to {@link NormalizedQuad} on load. */
export interface NormalizedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Crop a region of the composited bus, then warp it onto an output quad. */
export interface VideoOutputFrame {
  crop: NormalizedQuad;
  dest: NormalizedQuad;
}

export const OUTPUT_FRAME_MIN_SIZE = 0.02;

export type QuadCorner = keyof NormalizedQuad;
