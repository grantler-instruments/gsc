import {
  type IdbOflCatalogCache,
  idbGetOflCatalogCache,
  idbPutOflCatalogCache,
  initProjectIdb,
  OFL_CATALOG_CACHE_VERSION,
  type OflCatalogCacheFingerprint,
} from "../project-idb";
import type { OflCatalogEntry, OflFixtureListEntry, OflManufacturer } from "./types";

export function createOflCatalogFingerprint(
  manufacturers: readonly OflManufacturer[],
  fixtureEntries: readonly OflFixtureListEntry[],
): OflCatalogCacheFingerprint {
  return {
    manufacturerCount: manufacturers.length,
    fixtureCount: fixtureEntries.length,
  };
}

export function oflCatalogFingerprintMatches(
  cached: OflCatalogCacheFingerprint,
  current: OflCatalogCacheFingerprint,
): boolean {
  return (
    cached.fixtureCount === current.fixtureCount &&
    cached.manufacturerCount === current.manufacturerCount
  );
}

export async function readOflCatalogCache(
  fingerprint: OflCatalogCacheFingerprint,
): Promise<IdbOflCatalogCache | undefined> {
  await initProjectIdb();
  const cached = await idbGetOflCatalogCache();
  if (!cached || !oflCatalogFingerprintMatches(cached.fingerprint, fingerprint)) {
    return undefined;
  }
  return cached;
}

export async function writeOflCatalogCache(
  manufacturers: OflManufacturer[],
  catalog: OflCatalogEntry[],
  fingerprint: OflCatalogCacheFingerprint,
): Promise<void> {
  await initProjectIdb();
  await idbPutOflCatalogCache({
    version: OFL_CATALOG_CACHE_VERSION,
    fingerprint,
    cachedAt: Date.now(),
    manufacturers,
    catalog,
  });
}
