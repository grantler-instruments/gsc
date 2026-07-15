type SequenceTimerHandle = ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>;

const timersByRoot = new Map<string, SequenceTimerHandle[]>();

/** Clear timers for one sequence (by root id), or all sequences when omitted. */
export function clearSequenceTimers(rootId?: string): void {
  if (rootId === undefined) {
    for (const timers of timersByRoot.values()) {
      for (const t of timers) {
        clearTimeout(t);
        clearInterval(t);
      }
    }
    timersByRoot.clear();
    return;
  }
  const timers = timersByRoot.get(rootId);
  if (!timers) return;
  for (const t of timers) {
    clearTimeout(t);
    clearInterval(t);
  }
  timersByRoot.delete(rootId);
}

export function scheduleSequenceStep(rootId: string, fn: () => void, delayMs: number): void {
  const timer = setTimeout(fn, delayMs);
  const timers = timersByRoot.get(rootId);
  if (timers) {
    timers.push(timer);
  } else {
    timersByRoot.set(rootId, [timer]);
  }
}

/** Poll until playback-end notifications land (headless CI may throttle rAF/setTimeout). */
export function scheduleSequenceStepWatchdog(
  rootId: string,
  fn: () => void,
  intervalMs = 100,
): void {
  const timer = setInterval(fn, intervalMs);
  const timers = timersByRoot.get(rootId);
  if (timers) {
    timers.push(timer);
  } else {
    timersByRoot.set(rootId, [timer]);
  }
}
