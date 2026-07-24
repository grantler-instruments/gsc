export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function clampPan(value: number): number {
  return Math.max(-1, Math.min(1, value));
}
