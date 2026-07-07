import { describe, expect, it } from "vitest";
import { filterOflCatalog } from "./catalog";
import { OFL_ALL_CATEGORIES, OFL_ALL_MANUFACTURERS } from "./constants";
import type { OflCatalogEntry } from "./types";

const catalog: OflCatalogEntry[] = [
  {
    manufacturerKey: "robe",
    manufacturerName: "Robe",
    fixtureKey: "robin-600",
    name: "Robin 600",
    categories: ["Moving Head", "Color Changer"],
  },
  {
    manufacturerKey: "generic",
    manufacturerName: "Generic",
    fixtureKey: "rgb-par",
    name: "RGB Par",
    categories: ["Color Changer", "Dimmer"],
  },
  {
    manufacturerKey: "etc",
    manufacturerName: "ETC",
    fixtureKey: "source-four",
    name: "Source Four",
    categories: ["Dimmer"],
  },
];

describe("filterOflCatalog", () => {
  it("searches across manufacturers without a manufacturer filter", () => {
    const results = filterOflCatalog(catalog, {
      query: "robin",
      manufacturerKey: OFL_ALL_MANUFACTURERS,
      category: OFL_ALL_CATEGORIES,
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.manufacturerKey).toBe("robe");
  });

  it("filters by manufacturer", () => {
    const results = filterOflCatalog(catalog, {
      query: "",
      manufacturerKey: "generic",
      category: OFL_ALL_CATEGORIES,
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.fixtureKey).toBe("rgb-par");
  });

  it("filters by category", () => {
    const results = filterOflCatalog(catalog, {
      query: "",
      manufacturerKey: OFL_ALL_MANUFACTURERS,
      category: "Moving Head",
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Robin 600");
  });

  it("combines search, manufacturer, and category filters", () => {
    const results = filterOflCatalog(catalog, {
      query: "rgb",
      manufacturerKey: "generic",
      category: "Color Changer",
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.fixtureKey).toBe("rgb-par");
  });
});
