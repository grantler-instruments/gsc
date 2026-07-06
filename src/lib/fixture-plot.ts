import type { Fixture } from "../types/fixture";
import type {
  FixturePlot,
  FixturePlotChannelMap,
  FixturePlotEntry,
  FixtureRenderKind,
} from "../types/fixture-plot";
import { fixtureChannelLabel } from "./dmx";
import {
  findFirstChannelByKind,
  fixtureHasRgbChannels,
  fixtureOflChannels,
} from "./fixture-definition";

export const DEFAULT_PLOT_ENTRY_SIZE = 0.12;
export const LEGACY_PLOT_ENTRY_SIZE = 0.08;
export const MIN_PLOT_ENTRY_SIZE = 0.06;
export const MAX_PLOT_ENTRY_SIZE = 0.24;

export interface FixtureVisualState {
  opacity: number;
  fill?: string;
  channels: number[];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampPlotSize(value: number | undefined): number {
  const raw = value ?? DEFAULT_PLOT_ENTRY_SIZE;
  const size = raw === LEGACY_PLOT_ENTRY_SIZE ? DEFAULT_PLOT_ENTRY_SIZE : raw;
  return Math.max(MIN_PLOT_ENTRY_SIZE, Math.min(MAX_PLOT_ENTRY_SIZE, size));
}

function clampPlotCoord(value: number, size: number): number {
  const half = size / 2;
  return Math.max(half, Math.min(1 - half, clamp01(value)));
}

export function emptyFixturePlot(): FixturePlot {
  return { entries: [] };
}

export function inferFixtureRenderKind(fixture: Fixture): FixtureRenderKind {
  if (fixture.channelCount === 1 && !fixture.ofl) return "dimmer";

  if (fixture.ofl) {
    if (fixtureHasRgbChannels(fixture.ofl)) return "rgb";
    const kinds = new Set(fixtureOflChannels(fixture.ofl).map((channel) => channel.kind));
    if (kinds.has("intensity") && kinds.size === 1) return "dimmer";
    if (kinds.has("intensity") && !kinds.has("red") && !kinds.has("green") && !kinds.has("blue")) {
      return "dimmer";
    }
  }

  if (fixture.channelCount === 1) return "dimmer";

  return "abstract";
}

export function defaultFixturePlotChannelMap(
  fixture: Fixture,
  render: FixtureRenderKind,
): FixturePlotChannelMap | undefined {
  if (render === "dimmer") {
    return { intensity: findFirstChannelByKind(fixture.ofl, "intensity") ?? 0 };
  }
  if (render !== "rgb") return undefined;

  const red = findFirstChannelByKind(fixture.ofl, "red");
  const green = findFirstChannelByKind(fixture.ofl, "green");
  const blue = findFirstChannelByKind(fixture.ofl, "blue");
  const intensity = findFirstChannelByKind(fixture.ofl, "intensity");

  return {
    red: red ?? 0,
    green: green ?? 1,
    blue: blue ?? 2,
    ...(intensity !== undefined ? { intensity } : {}),
  };
}

function gridPosition(index: number, count: number): { x: number; y: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: (col + 0.5) / cols,
    y: (row + 0.5) / rows,
  };
}

export function defaultFixturePlotEntry(
  fixture: Fixture,
  index: number,
  total: number,
): FixturePlotEntry {
  const render = inferFixtureRenderKind(fixture);
  const size = DEFAULT_PLOT_ENTRY_SIZE;
  const { x, y } = gridPosition(index, total);
  return {
    fixtureId: fixture.id,
    x: clampPlotCoord(x, size),
    y: clampPlotCoord(y, size),
    size,
    render,
    channelMap: defaultFixturePlotChannelMap(fixture, render),
  };
}

export function normalizeFixturePlotEntry(
  entry: Partial<FixturePlotEntry> & Pick<FixturePlotEntry, "fixtureId">,
  fixture: Fixture,
): FixturePlotEntry {
  const render = entry.render ?? inferFixtureRenderKind(fixture);
  const size = clampPlotSize(entry.size);
  return {
    fixtureId: entry.fixtureId,
    x: clampPlotCoord(entry.x ?? 0.5, size),
    y: clampPlotCoord(entry.y ?? 0.5, size),
    size,
    render,
    channelMap: entry.channelMap ?? defaultFixturePlotChannelMap(fixture, render),
  };
}

export function normalizeFixturePlot(
  plot: Partial<FixturePlot> | undefined,
  fixtures: Fixture[] = [],
): FixturePlot {
  const byId = new Map((plot?.entries ?? []).map((entry) => [entry.fixtureId, entry]));
  let newIndex = 0;
  const entries = fixtures.map((fixture) => {
    const existing = byId.get(fixture.id);
    if (existing) {
      return normalizeFixturePlotEntry(existing, fixture);
    }
    const entry = defaultFixturePlotEntry(fixture, newIndex, fixtures.length);
    newIndex += 1;
    return entry;
  });

  return {
    backgroundAssetPath: plot?.backgroundAssetPath?.trim() || undefined,
    entries,
  };
}

export function ensureFixturePlot(plot: FixturePlot | undefined, fixtures: Fixture[]): FixturePlot {
  return normalizeFixturePlot(plot, fixtures);
}

export function fixturePlotNeedsSync(plot: FixturePlot | undefined, fixtures: Fixture[]): boolean {
  const normalized = normalizeFixturePlot(plot, fixtures);
  const currentIds = new Set((plot?.entries ?? []).map((entry) => entry.fixtureId));
  const fixtureIds = new Set(fixtures.map((fixture) => fixture.id));
  if (currentIds.size !== fixtureIds.size) return true;
  for (const id of fixtureIds) {
    if (!currentIds.has(id)) return true;
  }
  return JSON.stringify(plot?.entries ?? []) !== JSON.stringify(normalized.entries);
}

export function resolveFixtureVisualState(
  fixture: Fixture,
  values: number[],
  entry: FixturePlotEntry,
): FixtureVisualState {
  const channels = values.slice(0, fixture.channelCount);
  while (channels.length < fixture.channelCount) {
    channels.push(0);
  }

  const map = entry.channelMap ?? defaultFixturePlotChannelMap(fixture, entry.render);

  if (entry.render === "dimmer") {
    const channelIndex = map?.intensity ?? 0;
    const value = channels[channelIndex] ?? 0;
    return { opacity: value / 255, channels };
  }

  if (entry.render === "rgb") {
    const red = (channels[map?.red ?? 0] ?? 0) / 255;
    const green = (channels[map?.green ?? 1] ?? 0) / 255;
    const blue = (channels[map?.blue ?? 2] ?? 0) / 255;
    const intensityChannel = map?.intensity;
    const opacity =
      intensityChannel !== undefined
        ? (channels[intensityChannel] ?? 0) / 255
        : Math.max(red, green, blue, 0.08);
    return {
      opacity,
      fill: `rgb(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)})`,
      channels,
    };
  }

  return { opacity: 1, channels };
}

export interface FixturePlotTooltipChannel {
  label: string;
  value: number;
}

export function fixturePlotTooltipChannels(
  fixture: Fixture,
  values: number[],
): FixturePlotTooltipChannel[] {
  return Array.from({ length: fixture.channelCount }, (_, index) => ({
    label: fixtureChannelLabel(fixture, index) ?? "Level",
    value: values[index] ?? 0,
  }));
}

export function updateFixturePlotEntryPosition(
  plot: FixturePlot,
  fixtureId: string,
  x: number,
  y: number,
  fixtures: Fixture[],
): FixturePlot {
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  return {
    ...plot,
    entries: plot.entries.map((entry) => {
      if (entry.fixtureId !== fixtureId) return entry;
      const fixture = fixtureById.get(fixtureId);
      if (!fixture) return entry;
      const size = clampPlotSize(entry.size);
      return {
        ...entry,
        x: clampPlotCoord(x, size),
        y: clampPlotCoord(y, size),
      };
    }),
  };
}
