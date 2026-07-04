import { t } from "../i18n/t";
import type { Cue } from "../types/cue";
import type { VideoBus } from "../types/video-bus";
import { randomId } from "./random-id";
import { normalizeVideoEffects } from "./video-effects";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function defaultMasterVideoOutputName(): string {
  return t("videoOutput.defaultMainName");
}

export function normalizeMasterVideoOutputName(name: string | undefined): string {
  const trimmed = name?.trim();
  return trimmed || defaultMasterVideoOutputName();
}

/** Omit from snapshots when still the default name. */
export function serializeMasterVideoOutputName(name: string): string | undefined {
  const normalized = normalizeMasterVideoOutputName(name);
  return normalized === defaultMasterVideoOutputName() ? undefined : normalized;
}

export function defaultVideoBusName(buses: VideoBus[]): string {
  let index = buses.length + 1;
  while (buses.some((bus) => bus.name === t("videoOutput.defaultName", { number: index }))) {
    index += 1;
  }
  return t("videoOutput.defaultName", { number: index });
}

function normalizeVideoBusFields(raw: Partial<VideoBus> & Pick<VideoBus, "id">): VideoBus {
  const effects = normalizeVideoEffects(raw.effects);
  return {
    id: raw.id,
    name: raw.name?.trim() || "Untitled output",
    opacity: clamp01(raw.opacity ?? 1),
    ...(raw.muted ? { muted: true } : {}),
    ...(effects.length > 0 ? { effects } : {}),
  };
}

export function normalizeVideoBus(raw: Partial<VideoBus> & Pick<VideoBus, "id">): VideoBus {
  return normalizeVideoBusFields(raw);
}

export function normalizeVideoBuses(buses: VideoBus[] | undefined): VideoBus[] {
  if (!buses?.length) return [];
  return buses.map((bus) => normalizeVideoBusFields(bus));
}

export function createVideoBus(
  buses: VideoBus[],
  overrides: Partial<Omit<VideoBus, "id">> = {},
): VideoBus {
  return normalizeVideoBus({
    id: randomId(),
    name: overrides.name ?? defaultVideoBusName(buses),
    opacity: overrides.opacity ?? 1,
    muted: overrides.muted,
  });
}

export function findVideoBus(buses: VideoBus[], id: string | undefined): VideoBus | undefined {
  if (!id) return undefined;
  return buses.find((bus) => bus.id === id);
}

/** Resolve where a visual cue should appear; undefined means master output. */
export function resolveCueVideoBusId(
  cue: Pick<Cue, "videoBusId">,
  buses: VideoBus[],
): string | undefined {
  if (!cue.videoBusId || buses.length === 0) return undefined;
  return findVideoBus(buses, cue.videoBusId) ? cue.videoBusId : undefined;
}

/** Keep bus assignments only on visual cues with a valid bus; otherwise master (unset). */
export function normalizeCueVideoBus(cue: Cue, buses: VideoBus[]): Cue {
  if (cue.type !== "video" && cue.type !== "image") {
    if (!cue.videoBusId) return cue;
    const { videoBusId: _removed, ...rest } = cue;
    return rest;
  }

  const resolved = resolveCueVideoBusId(cue, buses);
  if (resolved === cue.videoBusId) return cue;

  if (!resolved) {
    if (!cue.videoBusId) return cue;
    const { videoBusId: _removed, ...rest } = cue;
    return rest;
  }

  return { ...cue, videoBusId: resolved };
}

export function busEffectiveOpacity(bus: VideoBus): number {
  return bus.muted ? 0 : clamp01(bus.opacity);
}

export function masterVideoOutputEffectiveOpacity(opacity: number | undefined): number {
  return clamp01(opacity ?? 1);
}
