import { describe, expect, it } from "vitest";
import type { Fixture } from "../types/fixture";
import {
  defaultFixturePlotEntry,
  ensureFixturePlot,
  fixturePlotStorageToView,
  fixturePlotTooltipChannels,
  fixturePlotViewBox,
  fixturePlotViewToStorage,
  inferFixtureRenderKind,
  normalizeFixturePlot,
  resolveFixtureVisualState,
} from "./fixture-plot";

function fixture(id: string, overrides: Partial<Omit<Fixture, "id">> = {}): Fixture {
  return {
    id,
    name: overrides.name ?? id,
    universe: overrides.universe ?? 1,
    startAddress: overrides.startAddress ?? 1,
    channelCount: overrides.channelCount ?? 1,
    ...overrides,
  };
}

describe("fixture plot", () => {
  it("preserves background asset path when normalizing", () => {
    const fixtures = [fixture("a")];
    const plot = normalizeFixturePlot(
      {
        backgroundAssetPath: "/assets/images/stage.png",
        entries: [],
      },
      fixtures,
    );
    expect(plot.backgroundAssetPath).toBe("/assets/images/stage.png");
    expect(plot.entries).toHaveLength(1);
  });

  it("maps stored plot coordinates to a widescreen view box", () => {
    expect(fixturePlotStorageToView(0.5, 0.25)).toEqual({ x: 1, y: 0.25 });
    expect(fixturePlotViewToStorage(1, 0.25)).toEqual({ x: 0.5, y: 0.25 });
    expect(fixturePlotViewBox()).toBe("0 0 2 1");
  });

  it("infers dimmer render for single-channel fixtures", () => {
    expect(inferFixtureRenderKind(fixture("a", { channelCount: 1 }))).toBe("dimmer");
  });

  it("infers rgb render from OFL channel keys", () => {
    expect(
      inferFixtureRenderKind(
        fixture("rgb", {
          channelCount: 4,
          ofl: {
            filePath: "/assets/fixtures/ofl/generic/rgb.json",
            manufacturerKey: "generic",
            manufacturer: "Generic",
            fixtureKey: "rgb",
            model: "RGB",
            modeName: "4ch",
            channels: [
              { key: "Red", kind: "red" },
              { key: "Green", kind: "green" },
              { key: "Blue", kind: "blue" },
              { key: "Dimmer", kind: "intensity" },
            ],
          },
        }),
      ),
    ).toBe("rgb");
  });

  it("infers moving head render from pan and tilt channels", () => {
    expect(
      inferFixtureRenderKind(
        fixture("spot", {
          channelCount: 4,
          ofl: {
            filePath: "/assets/fixtures/ofl/test/spot.json",
            manufacturerKey: "test",
            manufacturer: "Test",
            fixtureKey: "spot",
            model: "Spot",
            modeName: "std",
            categories: ["Moving Head"],
            channels: [
              { key: "Pan", kind: "pan", fineIndex: 1, angleRange: { start: 0, end: 540 } },
              { key: "Pan fine", kind: "pan", coarseIndex: 0 },
              { key: "Tilt", kind: "tilt", fineIndex: 3, angleRange: { start: 0, end: 270 } },
              { key: "Tilt fine", kind: "tilt", coarseIndex: 2 },
            ],
          },
        }),
      ),
    ).toBe("movingHead");
  });

  it("resolves beam direction for moving heads", () => {
    const f = fixture("spot", {
      channelCount: 4,
      ofl: {
        filePath: "/assets/fixtures/ofl/test/spot.json",
        manufacturerKey: "test",
        manufacturer: "Test",
        fixtureKey: "spot",
        model: "Spot",
        modeName: "std",
        categories: ["Moving Head"],
        channels: [
          { key: "Pan", kind: "pan", fineIndex: 1, angleRange: { start: 0, end: 540 } },
          { key: "Pan fine", kind: "pan", coarseIndex: 0 },
          { key: "Tilt", kind: "tilt", fineIndex: 3, angleRange: { start: 0, end: 270 } },
          { key: "Tilt fine", kind: "tilt", coarseIndex: 2 },
        ],
      },
    });
    const entry = defaultFixturePlotEntry(f, 0, 1);
    const visual = resolveFixtureVisualState(f, [128, 0, 64, 0], entry);
    expect(visual.beam).toBeDefined();
    expect(visual.beam?.reach).toBeGreaterThan(0);
  });

  it("creates plot entries for all fixtures", () => {
    const fixtures = [fixture("a", { channelCount: 1 }), fixture("b", { channelCount: 6 })];
    const plot = ensureFixturePlot(undefined, fixtures);
    expect(plot.entries).toHaveLength(2);
    expect(plot.entries[0]?.fixtureId).toBe("a");
    expect(plot.entries[0]?.render).toBe("dimmer");
    expect(plot.entries[1]?.render).toBe("abstract");
  });

  it("preserves existing positions when syncing", () => {
    const fixtures = [fixture("a", { channelCount: 1 })];
    const firstFixture = fixtures[0];
    if (!firstFixture) throw new Error("Expected fixture");
    const plot = normalizeFixturePlot(
      {
        entries: [
          {
            ...defaultFixturePlotEntry(firstFixture, 0, 1),
            x: 0.25,
            y: 0.75,
          },
        ],
      },
      fixtures,
    );
    expect(plot.entries[0]?.x).toBe(0.25);
    expect(plot.entries[0]?.y).toBe(0.75);
  });

  it("maps dimmer channel value to opacity", () => {
    const f = fixture("a", { channelCount: 1 });
    const entry = defaultFixturePlotEntry(f, 0, 1);
    const visual = resolveFixtureVisualState(f, [128], entry);
    expect(visual.opacity).toBeCloseTo(128 / 255, 5);
  });

  it("maps rgb channels to fill color", () => {
    const f = fixture("rgb", { channelCount: 3 });
    const visual = resolveFixtureVisualState(f, [255, 0, 0], {
      fixtureId: "rgb",
      x: 0.5,
      y: 0.5,
      size: 0.12,
      render: "rgb",
      channelMap: { red: 0, green: 1, blue: 2 },
    });
    expect(visual.fill).toBe("rgb(255, 0, 0)");
  });

  it("builds tooltip channel labels and values", () => {
    const f = fixture("a", {
      channelCount: 2,
      channels: [{ name: "Dim" }, { name: "Strobe" }],
    });
    expect(fixturePlotTooltipChannels(f, [128, 0])).toEqual([
      { label: "Dim", value: 128 },
      { label: "Strobe", value: 0 },
    ]);
  });
});
