type SequenceTimerHandle = ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>;

let timers: SequenceTimerHandle[] = [];

export function clearSequenceTimers(): void {
  for (const t of timers) {
    clearTimeout(t);
    clearInterval(t);
  }
  timers = [];
}

export function scheduleSequenceStep(fn: () => void, delayMs: number): void {
  timers.push(setTimeout(fn, delayMs));
}

/** Poll until playback-end notifications land (headless CI may throttle rAF/setTimeout). */
export function scheduleSequenceStepWatchdog(fn: () => void, intervalMs = 100): void {
  timers.push(setInterval(fn, intervalMs));
}
