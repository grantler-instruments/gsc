import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { Fixture } from "../types/fixture";
import type { FixturePlot } from "../types/fixture-plot";
import {
  buildFixturesProfileZip,
  mergeImportedFixturePlots,
  mergeImportedFixtures,
  parseFixturesProfileZip,
  prepareFixturesProfileImport,
  remapImportedFixturePlot,
} from "./fixture-profile";

const sampleFixture: Fixture = {
  id: "f1",
  name: "Par 1",
  universe: 1,
  startAddress: 1,
  channelCount: 6,
  ofl: {
    filePath: "/assets/fixtures/ofl/generic/rgb-par.json",
    manufacturerKey: "generic",
    manufacturer: "Generic",
    fixtureKey: "rgb-par",
    model: "RGB Par",
    modeName: "6-channel",
    channels: [
      { key: "Red", kind: "red" },
      { key: "Green", kind: "green" },
      { key: "Blue", kind: "blue" },
    ],
  },
};

const samplePlot: FixturePlot = {
  backgroundAssetPath: "/assets/images/venue-floor.png",
  entries: [
    {
      fixtureId: "f1",
      x: 0.25,
      y: 0.75,
      size: 0.12,
      render: "rgb",
    },
  ],
};

describe("fixture-profile", () => {
  it("round-trips fixtures and profile files in a zip", async () => {
    const profileBytes = new TextEncoder().encode('{"name":"RGB Par"}');
    const blobs = new Map<string, Blob>([
      [
        "/assets/fixtures/ofl/generic/rgb-par.json",
        new Blob([profileBytes], { type: "application/json" }),
      ],
    ]);

    const { zip } = await buildFixturesProfileZip([sampleFixture], undefined, (path) =>
      blobs.get(path),
    );
    const parsed = parseFixturesProfileZip(zip);

    expect(parsed.snapshot.version).toBe(2);
    expect(parsed.snapshot.fixtures).toHaveLength(1);
    expect(parsed.snapshot.fixtures[0]?.name).toBe("Par 1");
    expect(parsed.profiles).toHaveLength(1);
    expect(parsed.profiles[0]?.path).toBe("/assets/fixtures/ofl/generic/rgb-par.json");
  });

  it("round-trips fixture plot layout and background image", async () => {
    const profileBytes = new TextEncoder().encode('{"name":"RGB Par"}');
    const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const blobs = new Map<string, Blob>([
      [
        "/assets/fixtures/ofl/generic/rgb-par.json",
        new Blob([profileBytes], { type: "application/json" }),
      ],
      ["/assets/images/venue-floor.png", new Blob([imageBytes], { type: "image/png" })],
    ]);

    const { zip } = await buildFixturesProfileZip(
      [sampleFixture],
      samplePlot,
      (path) => blobs.get(path),
      { name: "Main Hall" },
    );
    const parsed = parseFixturesProfileZip(zip);

    expect(parsed.snapshot.name).toBe("Main Hall");
    expect(parsed.snapshot.fixturePlot?.backgroundAssetPath).toBe("/assets/images/venue-floor.png");
    expect(parsed.snapshot.fixturePlot?.entries[0]?.x).toBe(0.25);
    expect(parsed.profiles).toHaveLength(2);
  });

  it("parses legacy v1 profiles without plot data", () => {
    const snapshot = JSON.stringify({ version: 1, fixtures: [sampleFixture] });
    const data = zipSync({
      "fixtures.json": strToU8(snapshot),
      "assets/fixtures/ofl/generic/rgb-par.json": new TextEncoder().encode("{}"),
    });
    const parsed = parseFixturesProfileZip(data);

    expect(parsed.snapshot.version).toBe(1);
    expect(parsed.snapshot.fixturePlot).toBeUndefined();
  });

  it("remaps ids and conflicting addresses on import", () => {
    const existing: Fixture[] = [
      {
        id: "existing",
        name: "Dimmer",
        universe: 1,
        startAddress: 1,
        channelCount: 6,
      },
    ];
    const imported = prepareFixturesProfileImport(
      { version: 2, fixtures: [sampleFixture], fixturePlot: samplePlot },
      [
        {
          path: "/assets/fixtures/ofl/generic/rgb-par.json",
          data: new TextEncoder().encode("{}"),
        },
        {
          path: "/assets/images/venue-floor.png",
          data: new Uint8Array([1, 2, 3]),
        },
      ],
      existing,
      [],
    );

    expect(imported.fixtures).toHaveLength(1);
    expect(imported.fixtures[0]?.id).not.toBe("f1");
    expect(imported.fixtures[0]?.startAddress).toBe(7);
    expect(imported.profiles[0]?.path).toBe("/assets/fixtures/ofl/generic/rgb-par.json");
    expect(imported.fixturePlot?.entries[0]?.fixtureId).toBe(imported.fixtures[0]?.id);
    expect(imported.fixturePlot?.entries[0]?.x).toBe(0.25);
    expect(imported.fixturePlot?.backgroundAssetPath).toBe("/assets/images/venue-floor.png");
  });

  it("keeps original addresses on replace import", () => {
    const existing: Fixture[] = [
      {
        id: "existing",
        name: "Dimmer",
        universe: 1,
        startAddress: 1,
        channelCount: 6,
      },
    ];
    const imported = prepareFixturesProfileImport(
      { version: 2, fixtures: [sampleFixture] },
      [],
      existing,
      [],
      "replace",
    );

    expect(imported.fixtures[0]?.startAddress).toBe(1);
  });

  it("avoids profile path collisions with existing project files", () => {
    const result = prepareFixturesProfileImport(
      { version: 1, fixtures: [sampleFixture] },
      [
        {
          path: "/assets/fixtures/ofl/generic/rgb-par.json",
          data: new TextEncoder().encode("{}"),
        },
      ],
      [],
      ["/assets/fixtures/ofl/generic/rgb-par.json"],
    );

    expect(result.profiles[0]?.path).toBe("/assets/fixtures/ofl/generic/rgb-par_2.json");
    expect(result.fixtures[0]?.ofl?.filePath).toBe("/assets/fixtures/ofl/generic/rgb-par_2.json");
  });

  it("merges imported fixtures after existing ones", () => {
    const existing: Fixture[] = [
      {
        id: "a",
        name: "A",
        universe: 1,
        startAddress: 1,
        channelCount: 1,
      },
    ];
    const imported: Fixture[] = [
      {
        id: "b",
        name: "B",
        universe: 1,
        startAddress: 2,
        channelCount: 1,
      },
    ];

    expect(mergeImportedFixtures(existing, imported)).toEqual([...existing, imported[0]]);
  });

  it("merges plot entries while preserving existing layout", () => {
    const existingFixture: Fixture = {
      id: "a",
      name: "A",
      universe: 1,
      startAddress: 1,
      channelCount: 1,
    };
    const importedFixture: Fixture = {
      id: "b",
      name: "B",
      universe: 1,
      startAddress: 2,
      channelCount: 1,
    };
    const existingPlot: FixturePlot = {
      entries: [
        {
          fixtureId: "a",
          x: 0.1,
          y: 0.2,
          size: 0.12,
          render: "dimmer",
        },
      ],
    };
    const importedPlot: FixturePlot = {
      backgroundAssetPath: "/assets/images/stage.png",
      entries: [
        {
          fixtureId: "b",
          x: 0.8,
          y: 0.9,
          size: 0.12,
          render: "dimmer",
        },
      ],
    };

    const merged = mergeImportedFixturePlots(existingPlot, importedPlot, [
      existingFixture,
      importedFixture,
    ]);

    expect(merged.entries).toHaveLength(2);
    expect(merged.entries[0]?.fixtureId).toBe("a");
    expect(merged.entries[0]?.x).toBe(0.1);
    expect(merged.entries[1]?.fixtureId).toBe("b");
    expect(merged.entries[1]?.x).toBe(0.8);
    expect(merged.backgroundAssetPath).toBe("/assets/images/stage.png");
  });

  it("remaps imported plot fixture ids and background paths", () => {
    const idMap = new Map([["f1", "new-f1"]]);
    const pathMap = new Map([
      ["/assets/images/venue-floor.png", "/assets/images/venue-floor_2.png"],
    ]);
    const remapped = remapImportedFixturePlot(samplePlot, idMap, pathMap);

    expect(remapped?.entries[0]?.fixtureId).toBe("new-f1");
    expect(remapped?.backgroundAssetPath).toBe("/assets/images/venue-floor_2.png");
  });
});
