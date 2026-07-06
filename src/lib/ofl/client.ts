import { t } from "../../i18n/t";
import { idbGetOflCache, idbPutOflCache, initProjectIdb } from "../project-idb";
import { OFL_MANUFACTURERS_URL, oflFixtureRawUrl, oflManufacturerContentsUrl } from "./constants";
import { parseOflFixtureDefinition } from "./parse-definition";
import type { OflFixtureListEntry, OflFixtureSummary, OflManufacturer } from "./types";

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

export function parseOflFixtureJson(
  manufacturerKey: string,
  manufacturerName: string,
  fixtureKey: string,
  raw: unknown,
): OflFixtureSummary {
  const definition = parseOflFixtureDefinition(raw);
  if (!definition || definition.modes.length === 0) {
    throw new Error(t("ofl.noDmxModes"));
  }

  return {
    manufacturerKey,
    manufacturer: manufacturerName,
    fixtureKey,
    name: definition.name,
    categories: definition.categories,
    modes: definition.modes.map((mode) => ({
      name: mode.name,
      shortName: mode.shortName,
      channelCount: mode.channelCount,
      channels: mode.channels,
    })),
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
