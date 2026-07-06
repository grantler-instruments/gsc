import type {
  FixtureChannelCapability,
  FixtureChannelKind,
  FixtureOflChannel,
} from "../../types/fixture";

interface OflChannelRaw {
  fineChannelAliases?: string[];
  capability?: Record<string, unknown>;
  capabilities?: Record<string, unknown>[];
}

interface OflModeRaw {
  name?: string;
  shortName?: string;
  channels?: unknown[];
}

export interface ParsedOflMode {
  name: string;
  shortName?: string;
  channelCount: number;
  channels: FixtureOflChannel[];
}

export interface ParsedOflFixture {
  name: string;
  categories?: string[];
  modes: ParsedOflMode[];
}

function parseAngle(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(-?\d+(?:\.\d+)?)deg$/i.exec(value.trim());
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseKelvin(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d+(?:\.\d+)?)K$/i.exec(value.trim());
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeDmxRange(raw: unknown): [number, number] | undefined {
  if (!Array.isArray(raw) || raw.length < 2) return undefined;
  const start = Number(raw[0]);
  const end = Number(raw[1]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
  return [
    Math.max(0, Math.min(255, Math.round(start))),
    Math.max(0, Math.min(255, Math.round(end))),
  ];
}

function normalizeHexColors(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const colors = raw.filter(
    (entry): entry is string => typeof entry === "string" && entry.length > 0,
  );
  return colors.length > 0 ? colors : undefined;
}

function oflTypeToKind(type: unknown): FixtureChannelKind {
  if (typeof type !== "string") return "generic";

  switch (type) {
    case "Intensity":
      return "intensity";
    case "ColorIntensity":
      return "generic";
    case "Pan":
      return "pan";
    case "Tilt":
      return "tilt";
    case "PanTiltSpeed":
      return "panTiltSpeed";
    case "ColorTemperature":
      return "colorTemperature";
    case "ColorWheel":
    case "WheelSlot":
      return "colorWheel";
    case "Gobo":
      return "gobo";
    case "WheelSlotRotation":
      return "goboRotation";
    case "Prism":
      return "prism";
    case "ShutterStrobe":
      return "shutter";
    case "Focus":
      return "focus";
    case "Zoom":
      return "zoom";
    case "Iris":
      return "iris";
    case "ColorPreset":
      return "colorWheel";
    case "NoFunction":
      return "noFunction";
    case "Maintenance":
      return "maintenance";
    case "Effect":
    case "EffectSpeed":
      return "effect";
    default:
      return "generic";
  }
}

function colorIntensityKind(color: unknown): FixtureChannelKind {
  if (typeof color !== "string") return "generic";
  switch (color.trim()) {
    case "Red":
      return "red";
    case "Green":
      return "green";
    case "Blue":
      return "blue";
    case "White":
      return "white";
    case "Amber":
      return "amber";
    case "UV":
      return "uv";
    case "Lime":
      return "lime";
    case "Warm White":
      return "warmWhite";
    case "Cold White":
      return "coldWhite";
    case "Cyan":
      return "cyan";
    case "Magenta":
      return "magenta";
    case "Yellow":
      return "yellow";
    default:
      return "generic";
  }
}

function capabilityKind(cap: Record<string, unknown>): FixtureChannelKind {
  const type = cap.type;
  if (type === "ColorIntensity") {
    return colorIntensityKind(cap.color);
  }
  return oflTypeToKind(type);
}

function parseIndexedCapability(cap: Record<string, unknown>): FixtureChannelCapability | null {
  const dmxRange = normalizeDmxRange(cap.dmxRange);
  if (!dmxRange) return null;

  const kind = capabilityKind(cap);
  const label =
    (typeof cap.comment === "string" && cap.comment.trim()) ||
    (typeof cap.effectName === "string" && cap.effectName.trim()) ||
    (typeof cap.goboName === "string" && cap.goboName.trim()) ||
    undefined;

  const colors =
    normalizeHexColors(cap.colors) ??
    normalizeHexColors(cap.colorsStart) ??
    normalizeHexColors(cap.colorsEnd);

  const slotNumber =
    typeof cap.slotNumber === "number"
      ? cap.slotNumber
      : typeof cap.slotNumberStart === "number"
        ? cap.slotNumberStart
        : undefined;

  return {
    dmxRange,
    kind,
    label,
    colors,
    slotNumber,
  };
}

function parseContinuousCapability(
  cap: Record<string, unknown>,
): Pick<FixtureOflChannel, "kind" | "angleRange" | "colorTemperatureRange" | "wheel"> {
  const kind = capabilityKind(cap);
  const angleStart = parseAngle(cap.angleStart);
  const angleEnd = parseAngle(cap.angleEnd);
  const colorTemperatureStart = parseKelvin(cap.colorTemperatureStart);
  const colorTemperatureEnd = parseKelvin(cap.colorTemperatureEnd);
  const wheel = typeof cap.wheel === "string" ? cap.wheel : undefined;

  return {
    kind,
    ...(angleStart !== undefined && angleEnd !== undefined
      ? { angleRange: { start: angleStart, end: angleEnd } }
      : {}),
    ...(colorTemperatureStart !== undefined && colorTemperatureEnd !== undefined
      ? { colorTemperatureRange: { start: colorTemperatureStart, end: colorTemperatureEnd } }
      : {}),
    ...(wheel ? { wheel } : {}),
  };
}

function templateKeyToRegExp(templateKey: string): RegExp {
  const escaped = templateKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = escaped.replace(/\\\$pixelKey/g, "(.+)");
  return new RegExp(`^${pattern}$`);
}

function resolveChannelRaw(
  channelKey: string,
  availableChannels: Record<string, OflChannelRaw>,
  templateChannels: Record<string, OflChannelRaw> | undefined,
): OflChannelRaw | undefined {
  const direct = availableChannels[channelKey];
  if (direct) return direct;

  if (!templateChannels) return undefined;

  for (const [templateKey, definition] of Object.entries(templateChannels)) {
    if (!templateKey.includes("$pixelKey")) continue;
    if (templateKeyToRegExp(templateKey).test(channelKey)) {
      return definition;
    }
  }

  return undefined;
}

function inferKindFromKey(key: string): FixtureChannelKind {
  const normalized = key.trim().toLowerCase();
  if (!normalized) return "unused";

  const withoutFine = normalized.replace(/\s+fine(\^2)?$/, "");
  if (/\bred\b/.test(withoutFine)) return "red";
  if (/\bgreen\b/.test(withoutFine)) return "green";
  if (/\bblue\b/.test(withoutFine)) return "blue";
  if (/\bwhite\b/.test(withoutFine)) return "white";
  if (/\bamber\b/.test(withoutFine)) return "amber";
  if (/\bcyan\b/.test(withoutFine)) return "cyan";
  if (/\bmagenta\b/.test(withoutFine)) return "magenta";
  if (/\byellow\b/.test(withoutFine)) return "yellow";
  if (/\bpan\b/.test(withoutFine) && !/\btilt\b/.test(withoutFine)) return "pan";
  if (/\btilt\b/.test(withoutFine)) return "tilt";
  if (/\bdimmer\b/.test(withoutFine) || /\bintensity\b/.test(withoutFine)) return "intensity";
  if (/\bshutter\b/.test(withoutFine) || /\bstrobe\b/.test(withoutFine)) return "shutter";
  if (/\bgobo\b/.test(withoutFine)) return "gobo";
  if (/\bcolor\b/.test(withoutFine) && /\bwheel\b/.test(withoutFine)) return "colorWheel";
  if (/\bctc\b/.test(withoutFine) || /\bcolor temperature\b/.test(withoutFine)) {
    return "colorTemperature";
  }

  return "generic";
}

function parseModeChannelKey(
  channelKey: string,
  availableChannels: Record<string, OflChannelRaw>,
  templateChannels: Record<string, OflChannelRaw> | undefined,
): Omit<FixtureOflChannel, "coarseIndex" | "fineIndex"> {
  if (!channelKey.trim()) {
    return { key: "", kind: "unused" };
  }

  const raw = resolveChannelRaw(channelKey, availableChannels, templateChannels);
  if (!raw) {
    return { key: channelKey, kind: inferKindFromKey(channelKey) };
  }

  if (Array.isArray(raw.capabilities) && raw.capabilities.length > 0) {
    const capabilities = raw.capabilities
      .map((cap) =>
        cap && typeof cap === "object"
          ? parseIndexedCapability(cap as Record<string, unknown>)
          : null,
      )
      .filter((cap): cap is FixtureChannelCapability => cap !== null);

    const primaryKind = capabilities[0]?.kind ?? inferKindFromKey(channelKey);
    const wheelCap = raw.capabilities.find(
      (cap) =>
        cap &&
        typeof cap === "object" &&
        typeof (cap as Record<string, unknown>).wheel === "string",
    );
    const wheel =
      wheelCap && typeof (wheelCap as Record<string, unknown>).wheel === "string"
        ? String((wheelCap as Record<string, unknown>).wheel)
        : undefined;

    return {
      key: channelKey,
      kind: primaryKind,
      capabilities,
      ...(wheel ? { wheel } : {}),
    };
  }

  if (raw.capability && typeof raw.capability === "object") {
    const parsed = parseContinuousCapability(raw.capability as Record<string, unknown>);
    return {
      key: channelKey,
      kind: parsed.kind === "generic" ? inferKindFromKey(channelKey) : parsed.kind,
      angleRange: parsed.angleRange,
      colorTemperatureRange: parsed.colorTemperatureRange,
      wheel: parsed.wheel,
    };
  }

  return { key: channelKey, kind: inferKindFromKey(channelKey) };
}

function buildFineAliasOwners(
  availableChannels: Record<string, OflChannelRaw>,
  templateChannels: Record<string, OflChannelRaw> | undefined,
): Map<string, string> {
  const owners = new Map<string, string>();

  const register = (coarseKey: string, aliases: string[] | undefined) => {
    for (const alias of aliases ?? []) {
      if (alias.trim()) owners.set(alias.trim(), coarseKey);
    }
  };

  for (const [key, raw] of Object.entries(availableChannels)) {
    register(key, raw.fineChannelAliases);
  }
  for (const [key, raw] of Object.entries(templateChannels ?? {})) {
    register(key, raw.fineChannelAliases);
  }

  return owners;
}

function expandTemplateFineAliases(
  modeChannelKeys: string[],
  availableChannels: Record<string, OflChannelRaw>,
  templateChannels: Record<string, OflChannelRaw> | undefined,
  fineAliasOwners: Map<string, string>,
): void {
  for (const channelKey of modeChannelKeys) {
    if (fineAliasOwners.has(channelKey)) continue;

    for (const [templateKey, raw] of Object.entries(templateChannels ?? {})) {
      if (!templateKey.includes("$pixelKey")) continue;
      const match = templateKeyToRegExp(templateKey).exec(channelKey);
      if (!match) continue;

      for (const aliasTemplate of raw.fineChannelAliases ?? []) {
        const aliasKey = aliasTemplate.replace(/\$pixelKey/g, match[1] ?? "");
        fineAliasOwners.set(aliasKey, channelKey.replace(/\s+fine(\^2)?$/, ""));
      }
    }
  }
}

function linkCoarseFineChannels(channels: FixtureOflChannel[]): FixtureOflChannel[] {
  const result = channels.map((channel) => ({ ...channel }));
  const keyToIndex = new Map<string, number>();

  for (let index = 0; index < result.length; index += 1) {
    const key = result[index]?.key;
    if (key) keyToIndex.set(key, index);
  }

  for (let index = 0; index < result.length; index += 1) {
    const channel = result[index];
    if (!channel?.key || channel.kind === "unused") continue;

    const fineMatch = /^(.*)\s+fine(\^2)?$/.exec(channel.key);
    if (fineMatch) {
      const coarseKey = fineMatch[1]?.trim();
      const coarseIndex = coarseKey ? keyToIndex.get(coarseKey) : undefined;
      if (coarseIndex !== undefined) {
        result[index] = { ...channel, coarseIndex };
        const coarse = result[coarseIndex];
        if (coarse && coarse.fineIndex === undefined) {
          result[coarseIndex] = { ...coarse, fineIndex: index };
        }
      }
      continue;
    }

    const fineKey = `${channel.key} fine`;
    const fineIndex = keyToIndex.get(fineKey);
    if (fineIndex !== undefined) {
      result[index] = { ...channel, fineIndex };
      const fine = result[fineIndex];
      if (fine && fine.coarseIndex === undefined) {
        result[fineIndex] = { ...fine, coarseIndex: index };
      }
    }
  }

  return result;
}

function flattenModeChannelKeys(mode: OflModeRaw): string[] {
  const keys: string[] = [];

  for (const entry of mode.channels ?? []) {
    if (entry === null) {
      keys.push("");
      continue;
    }
    if (typeof entry === "string") {
      keys.push(entry.trim());
      continue;
    }
    if (entry && typeof entry === "object" && "insert" in entry) {
      // Matrix channel inserts are not expanded yet; reserve one slot as a placeholder.
      keys.push("(matrix)");
    }
  }

  return keys;
}

function parseMode(
  mode: OflModeRaw,
  availableChannels: Record<string, OflChannelRaw>,
  templateChannels: Record<string, OflChannelRaw> | undefined,
): ParsedOflMode | null {
  const name = mode.name?.trim();
  if (!name) return null;

  const modeChannelKeys = flattenModeChannelKeys(mode);
  const fineAliasOwners = buildFineAliasOwners(availableChannels, templateChannels);
  expandTemplateFineAliases(modeChannelKeys, availableChannels, templateChannels, fineAliasOwners);

  const channels: FixtureOflChannel[] = modeChannelKeys.map((channelKey) =>
    parseModeChannelKey(channelKey, availableChannels, templateChannels),
  );

  const linked = linkCoarseFineChannels(channels);

  // Apply alias-based coarse/fine links where name heuristics did not match.
  for (let index = 0; index < linked.length; index += 1) {
    const channel = linked[index];
    if (!channel?.key) continue;

    const coarseKey = fineAliasOwners.get(channel.key);
    if (coarseKey) {
      const coarseIndex = linked.findIndex((entry) => entry.key === coarseKey);
      if (coarseIndex >= 0) {
        linked[index] = { ...channel, coarseIndex };
        const coarse = linked[coarseIndex];
        if (coarse) {
          linked[coarseIndex] = { ...coarse, fineIndex: index };
        }
      }
    }
  }

  return {
    name,
    shortName: mode.shortName?.trim() || undefined,
    channelCount: Math.max(linked.length, 1),
    channels: linked,
  };
}

function readChannelMap(raw: unknown): Record<string, OflChannelRaw> {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  const channels: Record<string, OflChannelRaw> = {};

  for (const [key, value] of Object.entries(record)) {
    if (!key.trim() || !value || typeof value !== "object") continue;
    channels[key] = value as OflChannelRaw;
  }

  return channels;
}

/** Parse OFL fixture JSON into rich mode/channel definitions. */
export function parseOflFixtureDefinition(raw: unknown): ParsedOflFixture | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) return null;

  const categories = Array.isArray(record.categories)
    ? record.categories.filter((entry): entry is string => typeof entry === "string")
    : undefined;

  const availableChannels = readChannelMap(record.availableChannels);
  const templateChannels = readChannelMap(record.templateChannels);
  const modesRaw = Array.isArray(record.modes) ? (record.modes as OflModeRaw[]) : [];

  const modes = modesRaw
    .map((mode) => parseMode(mode, availableChannels, templateChannels))
    .filter((mode): mode is ParsedOflMode => mode !== null);

  if (modes.length === 0) return null;

  return { name, categories, modes };
}

export function resolveOflModeChannels(
  definition: ParsedOflFixture,
  modeName: string,
): FixtureOflChannel[] {
  const mode =
    definition.modes.find((entry) => entry.name === modeName) ?? definition.modes[0] ?? null;
  return mode?.channels ?? [];
}

/** Infer channel kind from a key when loading legacy profiles that only stored keys. */
export { inferKindFromKey };
