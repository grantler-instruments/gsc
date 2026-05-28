import { t } from "../i18n/t";

/** Format seconds as M:SS.s (e.g. 65.5 → "1:05.5") */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const frac = Math.round((seconds - whole) * 10);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  const base = `${mins}:${secs.toString().padStart(2, "0")}`;
  return frac > 0 ? `${base}.${frac}` : base;
}

/** Always includes tenths — fixed width for playback progress labels. */
export function formatPlaybackClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.0";
  const whole = Math.floor(seconds);
  const frac = Math.min(9, Math.max(0, Math.round((seconds - whole) * 10)));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}.${frac}`;
}

export function parseTimeSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  if (trimmed.includes(":")) {
    const [mins, secPart] = trimmed.split(":");
    const minutes = Number(mins);
    const seconds = Number(secPart);
    if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
    return Math.max(0, minutes * 60 + seconds);
  }

  const n = Number(trimmed);
  return Number.isNaN(n) ? null : Math.max(0, n);
}

export function clampNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Ensure out > in when out is set; returns adjusted out or undefined */
export function normalizePlaybackRange(
  inTime: number,
  outTime: number | undefined,
): number | undefined {
  if (outTime === undefined) return undefined;
  return outTime > inTime ? outTime : inTime + 0.1;
}

/** Compact label for cue list, e.g. "1:05 → 2:30" or "0:10 duration" */
export function formatPlaybackRangeLabel(
  inTime: number | undefined,
  outTime: number | undefined,
  isImage: boolean,
): string | null {
  const inVal = inTime ?? 0;
  const hasIn = inVal > 0;
  const hasOut = outTime !== undefined;

  if (!hasIn && !hasOut) {
    return isImage ? t("playback.infinite") : null;
  }
  const outVal = outTime ?? 0;

  if (isImage && hasOut) {
    return formatTime(outVal);
  }

  if (hasIn && hasOut) {
    return t("playback.inOutRange", {
      inTime: formatTime(inVal),
      outTime: formatTime(outVal),
    });
  }
  if (hasIn) return t("playback.inTime", { time: formatTime(inVal) });
  if (hasOut) return t("playback.outTime", { time: formatTime(outVal) });
  return null;
}
