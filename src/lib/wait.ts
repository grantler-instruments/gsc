import type { Cue } from "../types/cue";

export const DEFAULT_WAIT_DURATION_SEC = 1;
const MIN_WAIT_DURATION_SEC = 0.1;

export function isWaitCue(cue: Cue): boolean {
  return cue.type === "wait";
}

export function getWaitDurationSec(cue: Cue): number {
  const raw = cue.waitDurationSec ?? DEFAULT_WAIT_DURATION_SEC;
  return Math.max(MIN_WAIT_DURATION_SEC, raw);
}

export function formatWaitDurationLabel(cue: Cue): string {
  const sec = getWaitDurationSec(cue);
  return sec % 1 === 0 ? `${sec}s` : `${sec.toFixed(1)}s`;
}
