import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  idbGetOflCatalogCache,
  idbPutOflCatalogCache,
  initProjectIdb,
  OFL_CATALOG_CACHE_VERSION,
  resetProjectIdbForTests,
} from "../project-idb";
import {
  createOflCatalogFingerprint,
  oflCatalogFingerprintMatches,
  readOflCatalogCache,
  writeOflCatalogCache,
} from "./catalog-cache";

describe("ofl catalog cache", () => {
  beforeEach(async () => {
    resetProjectIdbForTests();
    vi.unstubAllGlobals();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    vi.stubGlobal("caches", undefined);

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("gsc-v1");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("deleteDatabase failed"));
      request.onblocked = () => resolve();
    });
  });

  it("creates and compares fingerprints from catalog counts", () => {
    const fingerprint = createOflCatalogFingerprint(
      [{ key: "robe", name: "Robe" }],
      [{ manufacturerKey: "robe", fixtureKey: "spot", name: "Spot" }],
    );
    expect(fingerprint).toEqual({ manufacturerCount: 1, fixtureCount: 1 });
    expect(oflCatalogFingerprintMatches(fingerprint, fingerprint)).toBe(true);
    expect(
      oflCatalogFingerprintMatches(fingerprint, { manufacturerCount: 1, fixtureCount: 2 }),
    ).toBe(false);
  });

  it("stores and reads enriched catalog entries from IndexedDB", async () => {
    await initProjectIdb();
    const manufacturers = [{ key: "robe", name: "Robe" }];
    const catalog = [
      {
        manufacturerKey: "robe",
        manufacturerName: "Robe",
        fixtureKey: "spot",
        name: "Spot",
        categories: ["Moving Head"],
      },
    ];
    const fingerprint = createOflCatalogFingerprint(manufacturers, catalog);

    await writeOflCatalogCache(manufacturers, catalog, fingerprint);

    const stored = await idbGetOflCatalogCache();
    expect(stored).toMatchObject({
      version: OFL_CATALOG_CACHE_VERSION,
      fingerprint,
      manufacturers,
      catalog,
    });

    const hit = await readOflCatalogCache(fingerprint);
    expect(hit?.catalog).toEqual(catalog);
    expect(await readOflCatalogCache({ manufacturerCount: 2, fixtureCount: 1 })).toBeUndefined();
  });

  it("rejects cache entries with the wrong schema version", async () => {
    await initProjectIdb();
    await idbPutOflCatalogCache({
      version: 99 as typeof OFL_CATALOG_CACHE_VERSION,
      fingerprint: { manufacturerCount: 1, fixtureCount: 1 },
      cachedAt: Date.now(),
      manufacturers: [],
      catalog: [],
    });

    expect(await idbGetOflCatalogCache()).toBeUndefined();
  });
});
