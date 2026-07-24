/** Circular drift between two positions within a playback slice window. */
export function driftSecWithinSlice(
  aSec: number,
  bSec: number,
  sliceSec: number,
  inTime = 0,
): number {
  const rel = (value: number) => {
    const offset = value - inTime;
    return ((offset % sliceSec) + sliceSec) % sliceSec;
  };
  const diff = Math.abs(rel(aSec) - rel(bSec));
  return Math.min(diff, sliceSec - diff);
}
