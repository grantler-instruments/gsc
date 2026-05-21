let timers: ReturnType<typeof setTimeout>[] = [];

export function clearSequenceTimers(): void {
  for (const t of timers) clearTimeout(t);
  timers = [];
}

export function scheduleSequenceStep(
  fn: () => void,
  delayMs: number,
): void {
  timers.push(setTimeout(fn, delayMs));
}
