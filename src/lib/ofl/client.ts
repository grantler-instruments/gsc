import { t } from "../../i18n/t";
import { OFL_MANUFACTURERS_URL, oflFixtureRawUrl, oflManufacturerContentsUrl } from "./constants";
import type {
  OflFixtureListEntry,
  OflFixtureSummary,
  OflManufacturer,
  OflModeSummary,
} from "./types";

interface GitHubContentEntry {
  name: string;
  type: "file" | "dir" | "symlink" | "submodule";
  download_url: string | null;
}

function fixtureKeyFromFileName(fileName: string): string | null {
  if (!fileName.endsWith(".json")) return null;
  if (fileName.endsWith("-redirect.json")) return null;
  return fileName.slice(0, -".json".length);
}

function titleCaseFromKey(key: string): string {
  return key
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function fetchOflManufacturers(): Promise<OflManufacturer[]> {
  const response = await fetch(OFL_MANUFACTURERS_URL);
  if (!response.ok) {
    throw new Error(t("ofl.manufacturersError", { status: response.status }));
  }

  const data = (await response.json()) as Record<string, { name?: string } | string>;
  return Object.entries(data)
    .filter(([key]) => key !== "$schema")
    .map(([key, value]) => ({
      key,
      name: typeof value === "string" ? value : value.name?.trim() || titleCaseFromKey(key),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchOflFixtureList(manufacturerKey: string): Promise<OflFixtureListEntry[]> {
  const response = await fetch(oflManufacturerContentsUrl(manufacturerKey));
  if (!response.ok) {
    throw new Error(t("ofl.fixturesError", { key: manufacturerKey, status: response.status }));
  }

  const entries = (await response.json()) as GitHubContentEntry[];
  return entries
    .filter((entry) => entry.type === "file")
    .map((entry) => fixtureKeyFromFileName(entry.name))
    .filter((fixtureKey): fixtureKey is string => fixtureKey !== null)
    .map((fixtureKey) => ({
      manufacturerKey,
      fixtureKey,
      name: titleCaseFromKey(fixtureKey),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function parseOflModes(raw: unknown): OflModeSummary[] {
  if (!raw || typeof raw !== "object" || !("modes" in raw)) return [];
  const modes = (raw as { modes?: unknown }).modes;
  if (!Array.isArray(modes)) return [];

  return modes
    .map((mode): OflModeSummary | null => {
      if (!mode || typeof mode !== "object") return null;
      const record = mode as { name?: string; shortName?: string; channels?: unknown };
      const name = record.name?.trim();
      if (!name) return null;
      const channels = Array.isArray(record.channels)
        ? record.channels
            .map((channel) => {
              if (typeof channel === "string" && channel.trim()) {
                return { key: channel.trim() };
              }
              return null;
            })
            .filter((channel): channel is { key: string } => channel !== null)
        : [];
      return {
        name,
        shortName: record.shortName?.trim() || undefined,
        channelCount: Math.max(channels.length, 1),
        channels,
      };
    })
    .filter((mode): mode is OflModeSummary => mode !== null);
}

export function parseOflFixtureJson(
  manufacturerKey: string,
  manufacturerName: string,
  fixtureKey: string,
  raw: unknown,
): OflFixtureSummary {
  const record =
    raw && typeof raw === "object" ? (raw as { name?: string; categories?: unknown }) : {};
  const modes = parseOflModes(raw);
  if (modes.length === 0) {
    throw new Error(t("ofl.noDmxModes"));
  }

  const categories = Array.isArray(record.categories)
    ? record.categories.filter((entry): entry is string => typeof entry === "string")
    : undefined;

  return {
    manufacturerKey,
    manufacturer: manufacturerName,
    fixtureKey,
    name: record.name?.trim() || titleCaseFromKey(fixtureKey),
    categories,
    modes,
  };
}

export async function fetchOflFixtureSummary(
  manufacturerKey: string,
  manufacturerName: string,
  fixtureKey: string,
): Promise<OflFixtureSummary> {
  const response = await fetch(oflFixtureRawUrl(manufacturerKey, fixtureKey));
  if (!response.ok) {
    throw new Error(
      t("ofl.fixtureError", {
        manufacturer: manufacturerKey,
        fixture: fixtureKey,
        status: response.status,
      }),
    );
  }
  const raw = await response.json();
  return parseOflFixtureJson(manufacturerKey, manufacturerName, fixtureKey, raw);
}

export function filterOflFixtureList(
  entries: OflFixtureListEntry[],
  query: string,
): OflFixtureListEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return entries;
  return entries.filter((entry) => {
    const haystack = `${entry.name} ${entry.fixtureKey}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

export function formatOflFixtureListEntry(entry: OflFixtureListEntry): string {
  return entry.name;
}
