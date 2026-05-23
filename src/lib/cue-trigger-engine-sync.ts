import type { Cue, CueType } from "../types/cue";

export interface CueTriggerTransportSnapshot {
  activeCueIds: string[];
  cueStartedAtMs: Record<string, number>;
}

export type LastFiredAtMs = Map<string, number>;

/**
 * Fire output cues when they enter the active transport set.
 * Dedupes by (cueId, cueStartedAtMs) so re-syncs do not double-send;
 * a new GO timestamp triggers again.
 */
export function syncCueTriggerEngine(params: {
  transport: CueTriggerTransportSnapshot;
  cues: Cue[];
  cueType: CueType;
  lastFiredAtMs: LastFiredAtMs;
  onFire: (cue: Cue) => void;
}): void {
  const { transport, cues, cueType, lastFiredAtMs, onFire } = params;
  const cueById = new Map(cues.map((c) => [c.id, c]));
  const activeSet = new Set(transport.activeCueIds);

  for (const id of transport.activeCueIds) {
    const startedAt = transport.cueStartedAtMs[id];
    if (startedAt === undefined) continue;
    if (lastFiredAtMs.get(id) === startedAt) continue;

    const cue = cueById.get(id);
    if (cue?.type === cueType) {
      onFire(cue);
    }
    lastFiredAtMs.set(id, startedAt);
  }

  for (const id of [...lastFiredAtMs.keys()]) {
    if (!activeSet.has(id)) {
      lastFiredAtMs.delete(id);
    }
  }
}
