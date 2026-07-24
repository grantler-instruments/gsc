/** Shared clock for transport timestamps and elapsed playback math. */
export function transportNowMs(): number {
  return Date.now();
}
