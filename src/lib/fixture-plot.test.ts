import { describe, expect, it } from "vitest";
import type { Fixture } from "../types/fixture";
import {
  defaultFixturePlotEntry,
  ensureFixturePlot,
  fixturePlotTooltipChannels,
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
  it("infers dimmer render for single-channel fixtures", () => {
    expect(inferFixtureRenderKind(fixture("a", { channelCount: 1 }))).toBe("dimmer");
  });

  it("infers rgb render from OFL channel keys", () => {
    expect(
      inferFixtureRenderKind(
        fixture("rgb", {
          channelCount: 4,
          ofl: {
            filePath: "/project/fixtures/ofl/generic/rgb.json",
            manufacturerKey: "generic",
            manufacturer: "Generic",
            fixtureKey: "rgb",
            model: "RGB",
            modeName: "4ch",
            channels: [{ key: "Red" }, { key: "Green" }, { key: "Blue" }, { key: "Dimmer" }],
          },
        }),
      ),
    ).toBe("rgb");
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
    const plot = normalizeFixturePlot(
      {
        entries: [
          {
            ...defaultFixturePlotEntry(fixtures[0]!, 0, 1),
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
