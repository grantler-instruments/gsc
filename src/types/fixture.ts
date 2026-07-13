/** `fine` marks the LSB slot paired with the preceding `16bit` coarse channel. */
export type FixtureChannelResolution = "16bit" | "fine";

export interface FixtureChannel {
  name?: string;
  resolution?: FixtureChannelResolution;
}

export interface FixtureOflChannel {
  key: string;
  resolution?: FixtureChannelResolution;
}

export interface FixtureOflProfile {
  /** Virtual asset path, e.g. /assets/fixtures/ofl/generic/4-channel-dimmer-pack.json */
  filePath: string;
  manufacturerKey: string;
  manufacturer: string;
  fixtureKey: string;
  model: string;
  modeName: string;
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
