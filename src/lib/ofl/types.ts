import type { FixtureOflChannel } from "../../types/fixture";

export interface OflModeSummary {
  name: string;
  shortName?: string;
  channelCount: number;
  channels: FixtureOflChannel[];
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

export interface OflCatalogEntry extends OflFixtureListEntry {
  manufacturerName: string;
  categories: string[];
}

export interface OflCatalogFilters {
  query: string;
  manufacturerKey: string;
  category: string;
}
