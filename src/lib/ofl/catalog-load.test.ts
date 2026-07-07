import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadOflCatalog } from "./catalog";
import * as catalogCache from "./catalog-cache";
import * as client from "./client";

vi.mock("./client", () => ({
  fetchOflManufacturers: vi.fn(),
  fetchAllOflFixtureEntries: vi.fn(),
  fetchOflFixtureMeta: vi.fn(),
}));

vi.mock("./catalog-cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./catalog-cache")>();
  return {
    ...actual,
    readOflCatalogCache: vi.fn(),
    writeOflCatalogCache: vi.fn(),
  };
});

describe("loadOflCatalog", () => {
  const manufacturers = [{ key: "robe", name: "Robe" }];
  const fixtureEntries = [{ manufacturerKey: "robe", fixtureKey: "spot", name: "Spot" }];
  const enrichedCatalog = [
    {
      manufacturerKey: "robe",
      manufacturerName: "Robe",
      fixtureKey: "spot",
      name: "Spot",
      categories: ["Moving Head"],
    },
  ];

  beforeEach(() => {
    vi.mocked(client.fetchOflManufacturers).mockResolvedValue(manufacturers);
    vi.mocked(client.fetchAllOflFixtureEntries).mockResolvedValue(fixtureEntries);
    vi.mocked(client.fetchOflFixtureMeta).mockResolvedValue({
      name: "Spot",
      categories: ["Moving Head"],
    });
    vi.mocked(catalogCache.readOflCatalogCache).mockResolvedValue(undefined);
    vi.mocked(catalogCache.writeOflCatalogCache).mockResolvedValue();
  });

  it("returns cached catalog without enriching fixtures", async () => {
    vi.mocked(catalogCache.readOflCatalogCache).mockResolvedValue({
      version: 1,
      fingerprint: { manufacturerCount: 1, fixtureCount: 1 },
      cachedAt: Date.now(),
      manufacturers,
      catalog: enrichedCatalog,
    });

    const onProgress = vi.fn();
    const result = await loadOflCatalog({ onProgress });

    expect(result).toEqual({ manufacturers, catalog: enrichedCatalog });
    expect(client.fetchOflFixtureMeta).not.toHaveBeenCalled();
    expect(catalogCache.writeOflCatalogCache).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(1, 1);
  });

  it("builds and stores catalog when cache misses", async () => {
    const result = await loadOflCatalog();

    expect(result.catalog).toEqual(enrichedCatalog);
    expect(client.fetchOflFixtureMeta).toHaveBeenCalledWith("robe", "spot");
    expect(catalogCache.writeOflCatalogCache).toHaveBeenCalledWith(manufacturers, enrichedCatalog, {
      manufacturerCount: 1,
      fixtureCount: 1,
    });
  });
});
