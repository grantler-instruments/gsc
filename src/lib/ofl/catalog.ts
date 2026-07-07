import {
  createOflCatalogFingerprint,
  readOflCatalogCache,
  writeOflCatalogCache,
} from "./catalog-cache";
import { fetchAllOflFixtureEntries, fetchOflFixtureMeta, fetchOflManufacturers } from "./client";
import { OFL_ALL_CATEGORIES, OFL_ALL_MANUFACTURERS } from "./constants";
import type {
  OflCatalogEntry,
  OflCatalogFilters,
  OflFixtureListEntry,
  OflManufacturer,
} from "./types";

const ENRICH_CONCURRENCY = 12;

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]!, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

function titleCaseFromKey(key: string): string {
  return key
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export interface BuildOflCatalogOptions {
  fixtureEntries?: OflFixtureListEntry[];
  onListLoaded?: (entries: OflCatalogEntry[]) => void;
  onProgress?: (loaded: number, total: number) => void;
}

export async function buildOflCatalog(
  manufacturers: OflManufacturer[],
  options: BuildOflCatalogOptions = {},
): Promise<OflCatalogEntry[]> {
  const manufacturerByKey = new Map(
    manufacturers.map((manufacturer) => [manufacturer.key, manufacturer]),
  );
  const fixtureEntries = options.fixtureEntries ?? (await fetchAllOflFixtureEntries());

  const listEntries: OflCatalogEntry[] = fixtureEntries.map((fixture) => ({
    manufacturerKey: fixture.manufacturerKey,
    manufacturerName:
      manufacturerByKey.get(fixture.manufacturerKey)?.name ??
      titleCaseFromKey(fixture.manufacturerKey),
    fixtureKey: fixture.fixtureKey,
    name: fixture.name,
    categories: [] as string[],
  }));

  listEntries.sort((a, b) => {
    const byManufacturer = a.manufacturerName.localeCompare(b.manufacturerName);
    if (byManufacturer !== 0) return byManufacturer;
    return a.name.localeCompare(b.name);
  });

  options.onListLoaded?.(listEntries);

  const enriched = await mapWithConcurrency(
    listEntries,
    ENRICH_CONCURRENCY,
    async (entry, index) => {
      try {
        const meta = await fetchOflFixtureMeta(entry.manufacturerKey, entry.fixtureKey);
        options.onProgress?.(index + 1, listEntries.length);
        return {
          ...entry,
          name: meta.name ?? entry.name,
          categories: meta.categories,
        };
      } catch {
        options.onProgress?.(index + 1, listEntries.length);
        return entry;
      }
    },
  );

  return enriched;
}

export async function loadOflCatalog(
  options: BuildOflCatalogOptions = {},
): Promise<{ manufacturers: OflManufacturer[]; catalog: OflCatalogEntry[] }> {
  const manufacturers = await fetchOflManufacturers();
  const fixtureEntries = await fetchAllOflFixtureEntries();
  const fingerprint = createOflCatalogFingerprint(manufacturers, fixtureEntries);

  const cached = await readOflCatalogCache(fingerprint);
  if (cached) {
    options.onListLoaded?.(cached.catalog);
    options.onProgress?.(cached.catalog.length, cached.catalog.length);
    return { manufacturers: cached.manufacturers, catalog: cached.catalog };
  }

  const catalog = await buildOflCatalog(manufacturers, {
    ...options,
    fixtureEntries,
  });
  await writeOflCatalogCache(manufacturers, catalog, fingerprint);
  return { manufacturers, catalog };
}

export function filterOflCatalog(
  catalog: OflCatalogEntry[],
  filters: OflCatalogFilters,
): OflCatalogEntry[] {
  const query = filters.query.trim().toLowerCase();

  return catalog.filter((entry) => {
    if (
      filters.manufacturerKey &&
      filters.manufacturerKey !== OFL_ALL_MANUFACTURERS &&
      entry.manufacturerKey !== filters.manufacturerKey
    ) {
      return false;
    }

    if (
      filters.category &&
      filters.category !== OFL_ALL_CATEGORIES &&
      !entry.categories.includes(filters.category)
    ) {
      return false;
    }

    if (!query) return true;

    const haystack =
      `${entry.name} ${entry.fixtureKey} ${entry.manufacturerName} ${entry.manufacturerKey} ${entry.categories.join(" ")}`.toLowerCase();
    return haystack.includes(query);
  });
}

export function formatOflCatalogEntryLabel(entry: OflCatalogEntry): string {
  return entry.name || titleCaseFromKey(entry.fixtureKey);
}

export function formatOflCatalogEntryDetail(entry: OflCatalogEntry): string {
  const categories = entry.categories.length > 0 ? entry.categories.join(", ") : undefined;
  return categories ? `${entry.manufacturerName} · ${categories}` : entry.manufacturerName;
}
