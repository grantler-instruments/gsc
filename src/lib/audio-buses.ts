import { t } from "../i18n/t";
import type { AudioBus } from "../types/audio-bus";
import type { Cue } from "../types/cue";
import { normalizeAudioEffects } from "./audio-effects";
import { randomId } from "./random-id";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function clampBusPan(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

export function defaultAudioBusName(buses: AudioBus[]): string {
  let index = buses.length + 1;
  while (buses.some((bus) => bus.name === t("audioMixer.defaultName", { number: index }))) {
    index += 1;
  }
  return t("audioMixer.defaultName", { number: index });
}

function normalizeAudioBusFields(raw: Partial<AudioBus> & Pick<AudioBus, "id">): AudioBus {
  const effects = normalizeAudioEffects(raw.effects);
  const pan = clampBusPan(raw.pan ?? 0);
  return {
    id: raw.id,
    name: raw.name?.trim() || "Untitled bus",
    volume: clamp01(raw.volume ?? 1),
    ...(raw.muted ? { muted: true } : {}),
    ...(pan !== 0 ? { pan } : {}),
    ...(raw.outputBusId ? { outputBusId: raw.outputBusId } : {}),
    ...(effects.length > 0 ? { effects } : {}),
  };
}

export function normalizeAudioBus(raw: Partial<AudioBus> & Pick<AudioBus, "id">): AudioBus {
  return normalizeAudioBusFields(raw);
}

export function normalizeAudioBuses(buses: AudioBus[] | undefined): AudioBus[] {
  if (!buses?.length) return [];

  const normalized = buses.map((bus) => normalizeAudioBusFields(bus));
  return normalized.map((bus) => {
    const outputBusId = resolveBusOutputBusId(bus, normalized);
    if (outputBusId === bus.outputBusId) return bus;
    if (!outputBusId) {
      if (!bus.outputBusId) return bus;
      const { outputBusId: _removed, ...rest } = bus;
      return rest;
    }
    return { ...bus, outputBusId };
  });
}

export function createAudioBus(
  buses: AudioBus[],
  overrides: Partial<Omit<AudioBus, "id">> = {},
): AudioBus {
  return normalizeAudioBus({
    id: randomId(),
    name: overrides.name ?? defaultAudioBusName(buses),
    volume: overrides.volume ?? 1,
    muted: overrides.muted,
    pan: overrides.pan,
    outputBusId: overrides.outputBusId,
  });
}

export function findAudioBus(buses: AudioBus[], id: string | undefined): AudioBus | undefined {
  if (!id) return undefined;
  return buses.find((bus) => bus.id === id);
}

/** Resolve where a cue should connect; undefined means direct to master. */
export function resolveCueAudioBusId(
  cue: Pick<Cue, "audioBusId">,
  buses: AudioBus[],
): string | undefined {
  if (!cue.audioBusId || buses.length === 0) return undefined;
  return findAudioBus(buses, cue.audioBusId) ? cue.audioBusId : undefined;
}

/** Resolve a bus post-fader destination; undefined means master output. */
export function resolveBusOutputBusId(
  bus: Pick<AudioBus, "id" | "outputBusId">,
  buses: AudioBus[],
): string | undefined {
  if (!bus.outputBusId || buses.length === 0) return undefined;
  if (bus.outputBusId === bus.id) return undefined;
  if (!findAudioBus(buses, bus.outputBusId)) return undefined;
  if (busRouteWouldCycle(buses, bus.id, bus.outputBusId)) return undefined;
  return bus.outputBusId;
}

/** True when routing `busId` into `outputBusId` would create a loop. */
export function busRouteWouldCycle(
  buses: AudioBus[],
  busId: string,
  outputBusId: string | undefined,
): boolean {
  if (!outputBusId) return false;
  if (outputBusId === busId) return true;

  const byId = new Map(buses.map((entry) => [entry.id, entry]));
  let current: string | undefined = outputBusId;
  const visited = new Set<string>();

  while (current) {
    if (current === busId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    const next = byId.get(current)?.outputBusId;
    current = next && findAudioBus(buses, next) ? next : undefined;
  }

  return false;
}

/** Keep bus assignments only on routable cues with a valid bus; otherwise master (unset). */
export function normalizeCueAudioBus(cue: Cue, buses: AudioBus[]): Cue {
  if (cue.type !== "audio" && cue.type !== "video") {
    if (!cue.audioBusId) return cue;
    const { audioBusId: _removed, ...rest } = cue;
    return rest;
  }

  const resolved = resolveCueAudioBusId(cue, buses);
  if (resolved === cue.audioBusId) return cue;

  if (!resolved) {
    if (!cue.audioBusId) return cue;
    const { audioBusId: _removed, ...rest } = cue;
    return rest;
  }

  return { ...cue, audioBusId: resolved };
}

export function busEffectiveVolume(bus: AudioBus): number {
  return bus.muted ? 0 : clamp01(bus.volume);
}
