/** Semantic channel type derived from OFL capability data or key-name inference. */
export type FixtureChannelKind =
  | "intensity"
  | "red"
  | "green"
  | "blue"
  | "white"
  | "amber"
  | "uv"
  | "lime"
  | "warmWhite"
  | "coldWhite"
  | "cyan"
  | "magenta"
  | "yellow"
  | "pan"
  | "tilt"
  | "panTiltSpeed"
  | "colorWheel"
  | "gobo"
  | "goboRotation"
  | "prism"
  | "shutter"
  | "focus"
  | "zoom"
  | "iris"
  | "colorTemperature"
  | "effect"
  | "maintenance"
  | "noFunction"
  /** Reserved DMX slot (OFL mode channel entry is null). */
  | "unused"
  | "generic";

export interface FixtureChannelCapability {
  /** Inclusive DMX value range (0–255). */
  dmxRange: [number, number];
  kind: FixtureChannelKind;
  /** Human label: gobo name, color preset comment, wheel slot description, etc. */
  label?: string;
  /** Hex colors for color presets and wheel slots. */
  colors?: string[];
  /** 1-based wheel slot number when applicable. */
  slotNumber?: number;
}

export interface FixtureChannel {
  name?: string;
}

export interface FixtureOflChannel {
  key: string;
  kind: FixtureChannelKind;
  /** When this is a fine channel, index of the coarse channel in the same mode. */
  coarseIndex?: number;
  /** When this is a coarse channel with a fine pair, index of the fine channel. */
  fineIndex?: number;
  /** Continuous pan/tilt range in degrees. */
  angleRange?: { start: number; end: number };
  /** Continuous color-temperature range in Kelvin. */
  colorTemperatureRange?: { start: number; end: number };
  /** Indexed capabilities for wheels, shutters, macros, etc. */
  capabilities?: FixtureChannelCapability[];
  /** OFL wheel name referenced by wheel-slot capabilities. */
  wheel?: string;
}

export interface FixtureOflProfile {
  /** Virtual asset path, e.g. /assets/fixtures/ofl/generic/4-channel-dimmer-pack.json */
  filePath: string;
  manufacturerKey: string;
  manufacturer: string;
  fixtureKey: string;
  model: string;
  modeName: string;
  /** Fixture categories from OFL (e.g. Moving Head, Color Changer). */
  categories?: string[];
  channels: FixtureOflChannel[];
}

export interface Fixture {
  id: string;
  name: string;
  /** 1-based DMX universe. */
  universe: number;
  /** 1-based start address within the universe (1–512). */
  startAddress: number;
  channelCount: number;
  /** Manual channel labels for generic fixtures. */
  channels?: FixtureChannel[];
  /** Optional imported Open Fixture Library profile. */
  ofl?: FixtureOflProfile;
}
