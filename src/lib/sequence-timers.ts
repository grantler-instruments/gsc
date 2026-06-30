const timersByRoot = new Map<string, ReturnType<typeof setTimeout>[]>();

/** Clear timers for one sequence (by root id), or all sequences when omitted. */
export function clearSequenceTimers(rootId?: string): void {
  if (rootId === undefined) {
    for (const timers of timersByRoot.values()) {
      for (const t of timers) clearTimeout(t);
    }
    timersByRoot.clear();
    return;
  }
  const timers = timersByRoot.get(rootId);
  if (!timers) return;
  for (const t of timers) clearTimeout(t);
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
