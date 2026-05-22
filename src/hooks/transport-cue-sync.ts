/** Transport fields that trigger cue fire-on-GO for MIDI/OSC engines. */
export function selectCueTriggerTransportState(s: {
  activeCueIds: string[];
  cueStartedAtMs: Record<string, number>;
}) {
  return {
    activeCueIds: s.activeCueIds,
    cueStartedAtMs: s.cueStartedAtMs,
  };
}

export function cueTriggerTransportStateChanged(
  prev: ReturnType<typeof selectCueTriggerTransportState>,
  next: ReturnType<typeof selectCueTriggerTransportState>,
): boolean {
  return (
    prev.activeCueIds !== next.activeCueIds ||
    prev.cueStartedAtMs !== next.cueStartedAtMs
  );
}
