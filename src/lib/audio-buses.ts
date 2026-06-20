import { t } from "../i18n/t";
import type { AudioBus } from "../types/audio-bus";
import type { Cue } from "../types/cue";
import { normalizeAudioEffects } from "./audio-effects";
import { randomId } from "./random-id";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function defaultAudioBusName(buses: AudioBus[]): string {
  let index = buses.length + 1;
  while (buses.some((bus) => bus.name === t("audioMixer.defaultName", { number: index }))) {
    index += 1;
  }
  return t("audioMixer.defaultName", { number: index });
}

export function normalizeAudioBus(raw: Partial<AudioBus> & Pick<AudioBus, "id">): AudioBus {
  const effects = normalizeAudioEffects(raw.effects);
  return {
    id: raw.id,
    name: raw.name?.trim() || "Untitled bus",
    volume: clamp01(raw.volume ?? 1),
    ...(raw.muted ? { muted: true } : {}),
    ...(effects.length > 0 ? { effects } : {}),
  };
}

export function normalizeAudioBuses(buses: AudioBus[] | undefined): AudioBus[] {
  if (!buses?.length) return [];
  return buses.map((bus) => normalizeAudioBus(bus));
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

export function busEffectiveVolume(bus: AudioBus): number {
  return bus.muted ? 0 : clamp01(bus.volume);
}
