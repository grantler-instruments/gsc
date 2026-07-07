import type { Fixture } from "../types/fixture";
import type { FixtureInspectorChannel } from "./fixture-inspector-groups";
import { combineCoarseFineDmx, splitCoarseFineDmx } from "./fixture-inspector-groups";

export interface FixtureAngleRange {
  start: number;
  end: number;
}

export interface FixturePositionAxis {
  channelIndex: number;
  fineChannelIndex?: number;
  angleRange: FixtureAngleRange;
  resolution: "8bit" | "16bit";
}

export interface FixturePositionAxes {
  pan: FixturePositionAxis;
  tilt: FixturePositionAxis;
}

export interface FixturePositionDegrees {
  pan: number;
  tilt: number;
}

export const DEFAULT_PAN_RANGE: FixtureAngleRange = { start: 0, end: 540 };
export const DEFAULT_TILT_RANGE: FixtureAngleRange = { start: 0, end: 270 };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function axisAngleRange(fixture: Fixture, channelIndex: number): FixtureAngleRange {
  const channel = fixture.ofl?.channels[channelIndex];
  if (channel?.angleRange) {
    return { ...channel.angleRange };
  }
  const kind = channel?.kind;
  if (kind === "pan") return { ...DEFAULT_PAN_RANGE };
  if (kind === "tilt") return { ...DEFAULT_TILT_RANGE };
  return { start: 0, end: 255 };
}

function buildPositionAxis(
  fixture: Fixture,
  channel: FixtureInspectorChannel,
): FixturePositionAxis {
  return {
    channelIndex: channel.channelIndex,
    fineChannelIndex: channel.fineChannelIndex,
    angleRange: axisAngleRange(fixture, channel.channelIndex),
    resolution: channel.resolution,
  };
}

export function detectFixturePositionAxes(
  fixture: Fixture,
  channels: FixtureInspectorChannel[],
): FixturePositionAxes | null {
  const pan = channels.find((channel) => channel.kind === "pan");
  const tilt = channels.find((channel) => channel.kind === "tilt");
  if (!pan || !tilt) return null;

  return {
    pan: buildPositionAxis(fixture, pan),
    tilt: buildPositionAxis(fixture, tilt),
  };
}

export function isPositionAxisChannel(axes: FixturePositionAxes, channelIndex: number): boolean {
  return (
    channelIndex === axes.pan.channelIndex ||
    channelIndex === axes.pan.fineChannelIndex ||
    channelIndex === axes.tilt.channelIndex ||
    channelIndex === axes.tilt.fineChannelIndex
  );
}

export function readAxisDmx(values: number[], axis: FixturePositionAxis): number {
  const coarse = values[axis.channelIndex] ?? 0;
  if (axis.fineChannelIndex !== undefined) {
    return combineCoarseFineDmx(coarse, values[axis.fineChannelIndex] ?? 0);
  }
  return Math.round((coarse / 255) * 65535);
}

export function writeAxisDmx(
  axis: FixturePositionAxis,
  dmx16: number,
): Array<{ channelIndex: number; value: number }> {
  const clamped = clamp(Math.round(dmx16), 0, 65535);
  if (axis.fineChannelIndex !== undefined) {
    const split = splitCoarseFineDmx(clamped);
    return [
      { channelIndex: axis.channelIndex, value: split.coarse },
      { channelIndex: axis.fineChannelIndex, value: split.fine },
    ];
  }
  return [{ channelIndex: axis.channelIndex, value: Math.round((clamped / 65535) * 255) }];
}

export function dmxToDegrees(dmx16: number, range: FixtureAngleRange): number {
  const span = range.end - range.start;
  if (span === 0) return range.start;
  const normalized = clamp(dmx16, 0, 65535) / 65535;
  return range.start + normalized * span;
}

export function degreesToDmx(degrees: number, range: FixtureAngleRange): number {
  const span = range.end - range.start;
  if (span === 0) return 0;
  const normalized = clamp(degrees, range.start, range.end);
  return Math.round(((normalized - range.start) / span) * 65535);
}

export function readFixturePositionDegrees(
  axes: FixturePositionAxes,
  values: number[],
): FixturePositionDegrees {
  return {
    pan: dmxToDegrees(readAxisDmx(values, axes.pan), axes.pan.angleRange),
    tilt: dmxToDegrees(readAxisDmx(values, axes.tilt), axes.tilt.angleRange),
  };
}

export function writeFixturePositionDegrees(
  axes: FixturePositionAxes,
  position: FixturePositionDegrees,
): Array<{ channelIndex: number; value: number }> {
  return [
    ...writeAxisDmx(axes.pan, degreesToDmx(position.pan, axes.pan.angleRange)),
    ...writeAxisDmx(axes.tilt, degreesToDmx(position.tilt, axes.tilt.angleRange)),
  ];
}

export function formatFixtureDegrees(value: number): string {
  return `${value.toFixed(1)}°`;
}

export function panCenterDegrees(range: FixtureAngleRange): number {
  return (range.start + range.end) / 2;
}

/** Factory center: pan midpoint, tilt at range start (typically 0°). */
export function fixtureCenterPosition(axes: FixturePositionAxes): FixturePositionDegrees {
  return {
    pan: panCenterDegrees(axes.pan.angleRange),
    tilt: axes.tilt.angleRange.start,
  };
}

/** Saved home position or factory center when unset. */
export function resolveFixtureHomePosition(
  fixture: Fixture,
  axes: FixturePositionAxes,
): FixturePositionDegrees {
  if (fixture.homePanTilt) {
    return {
      pan: clamp(fixture.homePanTilt.pan, axes.pan.angleRange.start, axes.pan.angleRange.end),
      tilt: clamp(fixture.homePanTilt.tilt, axes.tilt.angleRange.start, axes.tilt.angleRange.end),
    };
  }
  return fixtureCenterPosition(axes);
}

export function isMovingHeadFixture(fixture: Fixture): boolean {
  if (fixture.ofl?.categories?.includes("Moving Head")) return true;
  return detectFixturePositionAxesFromFixture(fixture) !== null;
}

/** Beam direction on the plot in radians; 0 points up (-Y). */
export function fixtureBeamDirectionRadians(
  axes: FixturePositionAxes,
  position: FixturePositionDegrees,
  headingDegrees = 0,
): number {
  const panOffset = position.pan - panCenterDegrees(axes.pan.angleRange);
  return ((headingDegrees + panOffset) * Math.PI) / 180;
}

/** Horizontal reach on a floor plan from tilt (1 = full length, 0 = straight down). */
export function fixtureBeamReach(position: FixturePositionDegrees): number {
  const tiltRad = (position.tilt * Math.PI) / 180;
  return Math.max(0, Math.cos(tiltRad));
}

export function detectFixturePositionAxesFromFixture(fixture: Fixture): FixturePositionAxes | null {
  if (!fixture.ofl?.channels.length) return null;

  const panChannel = fixture.ofl.channels.find(
    (channel) => channel.kind === "pan" && channel.coarseIndex === undefined,
  );
  const tiltChannel = fixture.ofl.channels.find(
    (channel) => channel.kind === "tilt" && channel.coarseIndex === undefined,
  );
  if (!panChannel || !tiltChannel) return null;

  const panIndex = fixture.ofl.channels.indexOf(panChannel);
  const tiltIndex = fixture.ofl.channels.indexOf(tiltChannel);

  const toInspectorChannel = (
    channel: (typeof fixture.ofl)["channels"][number],
    channelIndex: number,
  ): FixtureInspectorChannel => ({
    channelIndex,
    fineChannelIndex: channel.fineIndex,
    label: channel.key,
    kind: channel.kind,
    resolution: channel.fineIndex !== undefined ? "16bit" : "8bit",
  });

  return {
    pan: buildPositionAxis(fixture, toInspectorChannel(panChannel, panIndex)),
    tilt: buildPositionAxis(fixture, toInspectorChannel(tiltChannel, tiltIndex)),
  };
}
