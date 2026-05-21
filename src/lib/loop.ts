import type { Cue } from "../types/cue";

export function isLoopableMediaCue(cue: Cue): boolean {
  return cue.type === "audio" || cue.type === "video";
}

/** Total times the in/out slice plays (1 = no loop). */
export function getLoopPlayCount(cue: Cue): number | "inf" {
  if (!isLoopableMediaCue(cue) || !cue.loop) return 1;
  if (cue.loopCount !== undefined) {
    return Math.max(2, Math.floor(cue.loopCount));
  }
  return "inf";
}

export function isInfiniteLoop(cue: Cue): boolean {
  return getLoopPlayCount(cue) === "inf";
}

/** Parse inspector input — empty/∞ → infinite, otherwise a finite count (min 2). */
export function parseLoopIterationsInput(raw: string): number | "inf" {
  const trimmed = raw.trim();
  if (
    trimmed === "" ||
    trimmed === "∞" ||
    trimmed.toLowerCase() === "inf" ||
    trimmed.toLowerCase() === "infinity"
  ) {
    return "inf";
  }
  const n = Math.floor(Number(trimmed));
  if (!Number.isFinite(n)) return "inf";
  return Math.max(2, n);
}

export function formatLoopLabel(cue: Cue): string | null {
  if (!cue.loop || !isLoopableMediaCue(cue)) return null;
  const plays = getLoopPlayCount(cue);
  if (plays === "inf") return "∞ loops";
  return `${plays}× loop`;
}

/** Upper bound for sequence timing when a cue loops forever. */
export const INFINITE_LOOP_ESTIMATE_SEC = 60 * 60;
