import { describe, expect, it } from "vitest";
import {
  buildFixturesProfileZip,
  mergeImportedFixtures,
  parseFixturesProfileZip,
  prepareFixturesProfileImport,
} from "./fixture-profile";
import type { Fixture } from "../types/fixture";

const sampleFixture: Fixture = {
  id: "f1",
  name: "Par 1",
  universe: 1,
  startAddress: 1,
  channelCount: 6,
  ofl: {
    filePath: "/project/fixtures/ofl/generic/rgb-par.json",
    manufacturerKey: "generic",
    manufacturer: "Generic",
    fixtureKey: "rgb-par",
    model: "RGB Par",
    modeName: "6-channel",
    channels: [{ key: "Red" }, { key: "Green" }, { key: "Blue" }],
  },
};

describe("fixture-profile", () => {
  it("round-trips fixtures and profile files in a zip", async () => {
    const profileBytes = new TextEncoder().encode('{"name":"RGB Par"}');
    const blobs = new Map<string, Blob>([
      [
        "/project/fixtures/ofl/generic/rgb-par.json",
        new Blob([profileBytes], { type: "application/json" }),
      ],
    ]);

    const { zip } = await buildFixturesProfileZip([sampleFixture], (path) =>
      blobs.get(path),
    );
    const parsed = parseFixturesProfileZip(zip);

    expect(parsed.snapshot.fixtures).toHaveLength(1);
    expect(parsed.snapshot.fixtures[0]?.name).toBe("Par 1");
    expect(parsed.profiles).toHaveLength(1);
    expect(parsed.profiles[0]?.path).toBe(
      "/project/fixtures/ofl/generic/rgb-par.json",
    );
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
      { version: 1, fixtures: [sampleFixture] },
      [
        {
          path: "/project/fixtures/ofl/generic/rgb-par.json",
          data: new TextEncoder().encode("{}"),
        },
      ],
      existing,
      [],
    );

    expect(imported.fixtures).toHaveLength(1);
    expect(imported.fixtures[0]?.id).not.toBe("f1");
    expect(imported.fixtures[0]?.startAddress).toBe(7);
    expect(imported.profiles[0]?.path).toBe(
      "/project/fixtures/ofl/generic/rgb-par.json",
    );
  });

  it("avoids profile path collisions with existing project files", () => {
    const result = prepareFixturesProfileImport(
      { version: 1, fixtures: [sampleFixture] },
      [
        {
          path: "/project/fixtures/ofl/generic/rgb-par.json",
          data: new TextEncoder().encode("{}"),
        },
      ],
      [],
      ["/project/fixtures/ofl/generic/rgb-par.json"],
    );

    expect(result.profiles[0]?.path).toBe(
      "/project/fixtures/ofl/generic/rgb-par_2.json",
    );
    expect(result.fixtures[0]?.ofl?.filePath).toBe(
      "/project/fixtures/ofl/generic/rgb-par_2.json",
    );
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

    expect(mergeImportedFixtures(existing, imported)).toEqual([
      ...existing,
      imported[0],
    ]);
  });
});
