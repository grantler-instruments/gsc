import type { LightFadeChannelScope } from "../types/cue";
import type { Fixture, FixtureChannelKind, FixtureOflChannel } from "../types/fixture";
import { clampDmxValue } from "./dmx";
import {
  detectFixtureColorTriplet,
  readFixtureTripletValues,
  writeFixtureTripletValues,
} from "./fixture-color";
import { isFineChannel } from "./fixture-definition";
import {
  combineCoarseFineDmx,
  type FixtureInspectorChannel,
  groupFixtureInspectorChannels,
} from "./fixture-inspector-groups";
import {
  detectFixturePositionAxes,
  type FixturePositionAxis,
  readFixturePositionDegrees,
  writeAxisDmx,
  writeFixturePositionDegrees,
} from "./fixture-position";

const SNAP_KINDS: ReadonlySet<FixtureChannelKind> = new Set([
  "colorWheel",
  "gobo",
  "prism",
  "shutter",
  "maintenance",
]);

const COLOR_INTENSITY_KINDS: ReadonlySet<FixtureChannelKind> = new Set([
  "intensity",
  "red",
  "green",
  "blue",
  "white",
  "amber",
  "uv",
  "lime",
  "warmWhite",
  "coldWhite",
  "cyan",
  "magenta",
  "yellow",
  "colorTemperature",
]);

function shouldFadeChannelKind(
  kind: FixtureChannelKind | undefined,
  scope: LightFadeChannelScope,
): boolean {
  if (scope === "all") return true;
  if (!kind) return true;
  return COLOR_INTENSITY_KINDS.has(kind);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function linearInterpolateValues(fromValues: number[], toValues: number[], t: number): number[] {
  const count = Math.max(fromValues.length, toValues.length);
  return Array.from({ length: count }, (_, index) => {
    const from = fromValues[index] ?? 0;
    const to = toValues[index] ?? 0;
    return clampDmxValue(lerp(from, to, t));
  });
}

function snapValue(from: number, to: number, t: number): number {
  if (from === to) return from;
  return t < 0.5 ? from : to;
}

function shouldSnapChannel(
  channel: FixtureOflChannel | undefined,
  presets: FixtureInspectorChannel["presets"],
): boolean {
  if (!channel) return false;
  if (SNAP_KINDS.has(channel.kind)) return true;
  return Boolean(presets && presets.length > 1);
}

function applyChannelUpdates(
  result: number[],
  updates: ReadonlyArray<{ channelIndex: number; value: number }>,
  handled: Set<number>,
): void {
  for (const update of updates) {
    result[update.channelIndex] = clampDmxValue(update.value);
    handled.add(update.channelIndex);
  }
}

function interpolate16BitInspectorChannel(
  channel: FixtureInspectorChannel,
  fromValues: number[],
  toValues: number[],
  t: number,
): Array<{ channelIndex: number; value: number }> {
  const fineChannelIndex = channel.fineChannelIndex;
  if (fineChannelIndex === undefined) return [];

  const axis: FixturePositionAxis = {
    channelIndex: channel.channelIndex,
    fineChannelIndex,
    angleRange: { start: 0, end: 255 },
    resolution: "16bit",
  };
  const fromCombined = combineCoarseFineDmx(
    fromValues[channel.channelIndex] ?? 0,
    fromValues[fineChannelIndex] ?? 0,
  );
  const toCombined = combineCoarseFineDmx(
    toValues[channel.channelIndex] ?? 0,
    toValues[fineChannelIndex] ?? 0,
  );
  return writeAxisDmx(axis, Math.round(lerp(fromCombined, toCombined, t)));
}

/** Interpolate fixture DMX levels using semantic rules (color space, degrees, wheel snap). */
export function interpolateFixtureFadeValues(
  fixture: Fixture,
  fromValues: number[],
  toValues: number[],
  t: number,
  scope: LightFadeChannelScope = "all",
): number[] {
  const clampedT = clamp01(t);
  const result = linearInterpolateValues(fromValues, toValues, clampedT);
  const handled = new Set<number>();

  if (!fixture.ofl?.channels.length) {
    return result.slice(0, fixture.channelCount);
  }

  const groups = groupFixtureInspectorChannels(fixture);
  const colorGroup = groups.find((group) => group.id === "color");
  if (colorGroup && (scope === "all" || scope === "colorIntensity")) {
    const triplet = detectFixtureColorTriplet(colorGroup.channels);
    if (triplet) {
      const fromRgb = readFixtureTripletValues(triplet, fromValues);
      const toRgb = readFixtureTripletValues(triplet, toValues);
      applyChannelUpdates(
        result,
        writeFixtureTripletValues(triplet, {
          r: lerp(fromRgb.r, toRgb.r, clampedT),
          g: lerp(fromRgb.g, toRgb.g, clampedT),
          b: lerp(fromRgb.b, toRgb.b, clampedT),
        }),
        handled,
      );
    }
  }

  const positionGroup = groups.find((group) => group.id === "position");
  if (positionGroup) {
    const axes = detectFixturePositionAxes(fixture, positionGroup.channels);
    if (axes && scope === "all") {
      const fromPosition = readFixturePositionDegrees(axes, fromValues);
      const toPosition = readFixturePositionDegrees(axes, toValues);
      applyChannelUpdates(
        result,
        writeFixturePositionDegrees(axes, {
          pan: lerp(fromPosition.pan, toPosition.pan, clampedT),
          tilt: lerp(fromPosition.tilt, toPosition.tilt, clampedT),
        }),
        handled,
      );
    }
  }

  for (const group of groups) {
    for (const channel of group.channels) {
      if (handled.has(channel.channelIndex)) continue;
      if (!shouldFadeChannelKind(channel.kind, scope)) continue;

      if (
        channel.fineChannelIndex !== undefined &&
        channel.kind !== "pan" &&
        channel.kind !== "tilt"
      ) {
        applyChannelUpdates(
          result,
          interpolate16BitInspectorChannel(channel, fromValues, toValues, clampedT),
          handled,
        );
        continue;
      }

      const oflChannel = fixture.ofl.channels[channel.channelIndex];
      if (!shouldSnapChannel(oflChannel, channel.presets)) continue;

      const from = fromValues[channel.channelIndex] ?? 0;
      const to = toValues[channel.channelIndex] ?? 0;
      result[channel.channelIndex] = snapValue(from, to, clampedT);
      handled.add(channel.channelIndex);
    }
  }

  for (let index = 0; index < fixture.ofl.channels.length; index += 1) {
    if (handled.has(index) || !isFineChannel(fixture.ofl, index)) continue;
    const coarseIndex = fixture.ofl.channels[index]?.coarseIndex;
    if (coarseIndex !== undefined && handled.has(coarseIndex)) {
      handled.add(index);
    }
  }

  if (scope === "colorIntensity") {
    const scoped = [...fromValues];
    for (let index = 0; index < fixture.channelCount; index += 1) {
      const kind = fixture.ofl.channels[index]?.kind;
      if (isFineChannel(fixture.ofl, index)) {
        const coarseIndex = fixture.ofl.channels[index]?.coarseIndex;
        if (coarseIndex !== undefined && !handled.has(coarseIndex)) continue;
      }
      if (shouldFadeChannelKind(kind, scope)) {
        scoped[index] = result[index] ?? scoped[index] ?? 0;
      }
    }
    return scoped.slice(0, fixture.channelCount);
  }

  return result.slice(0, fixture.channelCount);
}
