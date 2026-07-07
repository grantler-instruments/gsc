import type { FixtureChannelKind } from "../types/fixture";
import type { FixtureInspectorChannel } from "./fixture-inspector-groups";

export type FixtureColorMode = "rgb" | "cmy";

export interface FixtureColorTriplet {
  mode: FixtureColorMode;
  /** Channel indices for the three primary color components. */
  channels: [number, number, number];
  /** Which kind maps to each index in channels. */
  kinds: [FixtureChannelKind, FixtureChannelKind, FixtureChannelKind];
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function findPrimaryChannel(
  channels: FixtureInspectorChannel[],
  kind: FixtureChannelKind,
): FixtureInspectorChannel | undefined {
  return channels.find((channel) => channel.kind === kind && channel.resolution === "8bit");
}

export function detectFixtureColorTriplet(
  channels: FixtureInspectorChannel[],
): FixtureColorTriplet | null {
  const red = findPrimaryChannel(channels, "red");
  const green = findPrimaryChannel(channels, "green");
  const blue = findPrimaryChannel(channels, "blue");
  if (red && green && blue) {
    return {
      mode: "rgb",
      channels: [red.channelIndex, green.channelIndex, blue.channelIndex],
      kinds: ["red", "green", "blue"],
    };
  }

  const cyan = findPrimaryChannel(channels, "cyan");
  const magenta = findPrimaryChannel(channels, "magenta");
  const yellow = findPrimaryChannel(channels, "yellow");
  if (cyan && magenta && yellow) {
    return {
      mode: "cmy",
      channels: [cyan.channelIndex, magenta.channelIndex, yellow.channelIndex],
      kinds: ["cyan", "magenta", "yellow"],
    };
  }

  return null;
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  return `#${[r, g, b].map((value) => clampByte(value).toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgb(hex: string): RgbColor | null {
  const normalized = hex.trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(normalized);
  if (!match?.[1]) return null;
  const digits = match[1];
  return {
    r: Number.parseInt(digits.slice(0, 2), 16),
    g: Number.parseInt(digits.slice(2, 4), 16),
    b: Number.parseInt(digits.slice(4, 6), 16),
  };
}

export function rgbToCmy({ r, g, b }: RgbColor): RgbColor {
  return { r: 255 - r, g: 255 - g, b: 255 - b };
}

export function cmyToRgb({ r, g, b }: RgbColor): RgbColor {
  return { r: 255 - r, g: 255 - g, b: 255 - b };
}

export function readFixtureTripletValues(triplet: FixtureColorTriplet, values: number[]): RgbColor {
  const primary = triplet.channels.map((index) => clampByte(values[index] ?? 0)) as [
    number,
    number,
    number,
  ];

  if (triplet.mode === "rgb") {
    return { r: primary[0], g: primary[1], b: primary[2] };
  }

  return cmyToRgb({ r: primary[0], g: primary[1], b: primary[2] });
}

export function writeFixtureTripletValues(
  triplet: FixtureColorTriplet,
  rgb: RgbColor,
): Array<{ channelIndex: number; value: number }> {
  const clamped = {
    r: clampByte(rgb.r),
    g: clampByte(rgb.g),
    b: clampByte(rgb.b),
  };

  const cmy = rgbToCmy(clamped);
  const primary =
    triplet.mode === "rgb" ? [clamped.r, clamped.g, clamped.b] : [cmy.r, cmy.g, cmy.b];

  return triplet.channels.map((channelIndex, index) => ({
    channelIndex,
    value: primary[index] ?? 0,
  }));
}

export function fixtureColorTripletHex(triplet: FixtureColorTriplet, values: number[]): string {
  return rgbToHex(readFixtureTripletValues(triplet, values));
}

const KIND_I18N: Partial<Record<FixtureChannelKind, string>> = {
  red: "inspector.dmxColorRed",
  green: "inspector.dmxColorGreen",
  blue: "inspector.dmxColorBlue",
  cyan: "inspector.dmxColorCyan",
  magenta: "inspector.dmxColorMagenta",
  yellow: "inspector.dmxColorYellow",
};

export function fixtureColorKindLabelKey(kind: FixtureChannelKind): string {
  return KIND_I18N[kind] ?? "inspector.level";
}

export function isPrimaryColorChannel(triplet: FixtureColorTriplet, channelIndex: number): boolean {
  return triplet.channels.includes(channelIndex);
}
