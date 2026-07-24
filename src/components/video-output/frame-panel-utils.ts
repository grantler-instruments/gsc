import { normalizeNormalizedRect } from "../../lib/video-output-frame";
import type {
  NormalizedPoint,
  NormalizedQuad,
  NormalizedRect,
} from "../../types/video-output-frame";
import { MIN_DRAG_SIZE, QUAD_CORNERS } from "./frame-panel-layout";

export function formatRectPercent(value: number): string {
  return (value * 100).toFixed(1);
}

export function parseRectPercentInput(value: string): number | undefined {
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(100, parsed)) / 100;
}

export function quadPolygonPoints(quad: NormalizedQuad): string {
  return QUAD_CORNERS.map((corner) => `${quad[corner].x * 100},${quad[corner].y * 100}`).join(" ");
}

export function cropDimClipPath(rect: NormalizedRect): string {
  const x1 = rect.x * 100;
  const y1 = rect.y * 100;
  const x2 = (rect.x + rect.w) * 100;
  const y2 = (rect.y + rect.h) * 100;
  return `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${x1}% ${y1}%, ${x2}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%, ${x1}% ${y1}%)`;
}

export function resizeRectFromCorner(
  origin: NormalizedRect,
  dx: number,
  dy: number,
  corner: "se" | "nw",
): NormalizedRect {
  if (corner === "se") {
    return normalizeNormalizedRect({
      x: origin.x,
      y: origin.y,
      w: Math.max(MIN_DRAG_SIZE, origin.w + dx),
      h: Math.max(MIN_DRAG_SIZE, origin.h + dy),
    });
  }

  let nextX = origin.x + dx;
  let nextY = origin.y + dy;
  let nextW = origin.w - dx;
  let nextH = origin.h - dy;

  if (nextW < MIN_DRAG_SIZE) {
    nextX = origin.x + origin.w - MIN_DRAG_SIZE;
    nextW = MIN_DRAG_SIZE;
  }
  if (nextH < MIN_DRAG_SIZE) {
    nextY = origin.y + origin.h - MIN_DRAG_SIZE;
    nextH = MIN_DRAG_SIZE;
  }

  return normalizeNormalizedRect({
    x: nextX,
    y: nextY,
    w: nextW,
    h: nextH,
  });
}

export function pointerToNormalized(
  clientX: number,
  clientY: number,
  bounds: DOMRect,
): NormalizedPoint {
  return {
    x: Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)),
    y: Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height)),
  };
}

export type RectDragMode = "move" | "resize-se" | "resize-nw";
