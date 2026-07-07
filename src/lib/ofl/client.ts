import { t } from "../../i18n/t";
import { idbGetOflCache, idbPutOflCache, initProjectIdb } from "../project-idb";
import { OFL_JSDELIVR_FLAT_URL, OFL_MANUFACTURERS_URL, oflFixtureRawUrl } from "./constants";
import { parseOflFixtureDefinition } from "./parse-definition";
import type { OflFixtureListEntry, OflFixtureSummary, OflManufacturer } from "./types";

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

export async function fetchAllOflFixtureEntries(): Promise<OflFixtureListEntry[]> {
  try {
    const data = await fetchJsonWithOflCache<{ files?: { name: string }[] }>(OFL_JSDELIVR_FLAT_URL);
    const files = Array.isArray(data.files) ? data.files : [];
    return parseOflFixtureFlatIndex(files);
  } catch (err) {
    const status = err instanceof Error ? err.message : "unknown";
    throw new Error(t("ofl.fixturesIndexError", { status }));
  }
}

export function parseOflFixtureFlatIndex(
  files: readonly { name: string }[],
): OflFixtureListEntry[] {
  const entries: OflFixtureListEntry[] = [];

  for (const file of files) {
    if (!file.name.startsWith("/fixtures/")) continue;
    if (!file.name.endsWith(".json")) continue;
    if (file.name.endsWith("-redirect.json")) continue;
    if (file.name === "/fixtures/manufacturers.json") continue;

    const relative = file.name.slice("/fixtures/".length);
    const slash = relative.indexOf("/");
    if (slash <= 0) continue;

    const manufacturerKey = relative.slice(0, slash);
    const fixtureKey = fixtureKeyFromFileName(relative.slice(slash + 1));
    if (!fixtureKey) continue;

    entries.push({
      manufacturerKey,
      fixtureKey,
      name: titleCaseFromKey(fixtureKey),
    });
  }

  return entries.sort((a, b) => {
    const byManufacturer = a.manufacturerKey.localeCompare(b.manufacturerKey);
    if (byManufacturer !== 0) return byManufacturer;
    return a.name.localeCompare(b.name);
  });
}

/** @deprecated Prefer fetchAllOflFixtureEntries — GitHub Contents API hits rate limits quickly. */
export async function fetchOflFixtureList(manufacturerKey: string): Promise<OflFixtureListEntry[]> {
  const all = await fetchAllOflFixtureEntries();
  return all.filter((entry) => entry.manufacturerKey === manufacturerKey);
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

export function parseOflFixtureMeta(raw: unknown): { name?: string; categories: string[] } {
  if (!raw || typeof raw !== "object") return { categories: [] };
  const record = raw as { name?: string; categories?: unknown };
  const categories = Array.isArray(record.categories)
    ? record.categories.filter((entry): entry is string => typeof entry === "string")
    : [];
  return {
    name: record.name?.trim() || undefined,
    categories,
  };
}

export async function fetchOflFixtureMeta(
  manufacturerKey: string,
  fixtureKey: string,
): Promise<{ name?: string; categories: string[] }> {
  const url = oflFixtureRawUrl(manufacturerKey, fixtureKey);
  const raw = await fetchJsonWithOflCache<unknown>(url);
  return parseOflFixtureMeta(raw);
}

export function formatOflFixtureListEntry(entry: OflFixtureListEntry): string {
  return entry.name;
}
