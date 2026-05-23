export interface OflModeSummary {
  name: string;
  shortName?: string;
  channelCount: number;
  channels: { key: string }[];
}

export interface OflFixtureSummary {
  manufacturerKey: string;
  manufacturer: string;
  fixtureKey: string;
  name: string;
  categories?: string[];
  modes: OflModeSummary[];
}

export interface OflManufacturer {
  key: string;
  name: string;
}

export interface OflFixtureListEntry {
  manufacturerKey: string;
  fixtureKey: string;
  name: string;
}
