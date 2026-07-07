import { describe, expect, it } from "vitest";
import { parseOflFixtureFlatIndex } from "./client";

describe("parseOflFixtureFlatIndex", () => {
  it("extracts fixture entries and skips redirects and schema files", () => {
    const entries = parseOflFixtureFlatIndex([
      { name: "/fixtures/manufacturers.json" },
      { name: "/fixtures/fun-generation/picospot-20-led.json" },
      { name: "/fixtures/fun-generation/old-fixture-redirect.json" },
      { name: "/README.md" },
      { name: "/fixtures/robe/robin-600.json" },
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      manufacturerKey: "fun-generation",
      fixtureKey: "picospot-20-led",
      name: "Picospot 20 Led",
    });
    expect(entries[1]).toMatchObject({
      manufacturerKey: "robe",
      fixtureKey: "robin-600",
    });
  });

  it("filters by manufacturer when using fetchOflFixtureList wrapper data", () => {
    const entries = parseOflFixtureFlatIndex([
      { name: "/fixtures/fun-generation/picospot-20-led.json" },
      { name: "/fixtures/fun-generation/separ-quad-led-rgbw.json" },
      { name: "/fixtures/generic/rgb-par.json" },
    ]);

    const funGeneration = entries.filter((entry) => entry.manufacturerKey === "fun-generation");
    expect(funGeneration).toHaveLength(2);
  });
});
