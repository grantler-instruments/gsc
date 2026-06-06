import { t } from "../../i18n/t";
import { idbGetOflCache, idbPutOflCache, initProjectIdb } from "../project-idb";
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

async function fetchJsonWithOflCache<T>(url: string): Promise<T> {
  await initProjectIdb();

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(String(response.status));
    }
    const body = await response.text();
    await idbPutOflCache(url, body, response.headers.get("content-type") ?? "application/json");
    return JSON.parse(body) as T;
  } catch (networkErr) {
    const cached = await idbGetOflCache(url);
    if (cached) {
      return JSON.parse(cached.body) as T;
    }
    throw networkErr;
  }
}

export async function fetchOflManufacturers(): Promise<OflManufacturer[]> {
  let data: Record<string, { name?: string } | string>;
  try {
    data =
      await fetchJsonWithOflCache<Record<string, { name?: string } | string>>(
        OFL_MANUFACTURERS_URL,
      );
  } catch (err) {
    const status = err instanceof Error ? err.message : "unknown";
    throw new Error(t("ofl.manufacturersError", { status }));
  }

  return Object.entries(data)
    .filter(([key]) => key !== "$schema")
    .map(([key, value]) => ({
      key,
      name: typeof value === "string" ? value : value.name?.trim() || titleCaseFromKey(key),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchOflFixtureList(manufacturerKey: string): Promise<OflFixtureListEntry[]> {
  const url = oflManufacturerContentsUrl(manufacturerKey);
  let entries: GitHubContentEntry[];
  try {
    entries = await fetchJsonWithOflCache<GitHubContentEntry[]>(url);
  } catch (err) {
    const status = err instanceof Error ? err.message : "unknown";
    throw new Error(t("ofl.fixturesError", { key: manufacturerKey, status }));
  }

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
  const url = oflFixtureRawUrl(manufacturerKey, fixtureKey);
  let raw: unknown;
  try {
    raw = await fetchJsonWithOflCache<unknown>(url);
  } catch (err) {
    const status = err instanceof Error ? err.message : "unknown";
    throw new Error(
      t("ofl.fixtureError", {
        manufacturer: manufacturerKey,
        fixture: fixtureKey,
        status,
      }),
    );
  }
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
