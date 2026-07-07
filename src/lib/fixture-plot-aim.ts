import type { FixturePositionAxes, FixturePositionDegrees } from "./fixture-position";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function coordToDegrees(value: number, range: { start: number; end: number }): number {
  const normalized = clamp01(value);
  return range.start + normalized * (range.end - range.start);
}

/** Map normalized stage coordinates (0–1) to pan/tilt degrees. */
export function plotStorageCoordsToPositionDegrees(
  x: number,
  y: number,
  axes: FixturePositionAxes,
): FixturePositionDegrees {
  return {
    pan: coordToDegrees(x, axes.pan.angleRange),
    tilt: coordToDegrees(y, axes.tilt.angleRange),
  };
}

/** Map view-box coordinates to pan/tilt degrees. */
export function plotViewCoordsToPositionDegrees(
  viewX: number,
  viewY: number,
  axes: FixturePositionAxes,
  viewWidth = 2,
): FixturePositionDegrees {
  return plotStorageCoordsToPositionDegrees(viewX / viewWidth, viewY, axes);
}
