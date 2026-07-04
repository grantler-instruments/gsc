/** Normalized axis-aligned rectangle; origin top-left, x→right, y→down (0–1). */
export interface NormalizedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Crop a region of the composited bus, then draw it on the output canvas. */
export interface VideoOutputFrame {
  crop: NormalizedRect;
  dest: NormalizedRect;
}

export const OUTPUT_FRAME_MIN_SIZE = 0.02;
