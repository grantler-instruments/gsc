export const OFL_REPO = "OpenLightingProject/open-fixture-library";
export const OFL_BRANCH = "master";

export const OFL_MANUFACTURERS_URL = `https://raw.githubusercontent.com/${OFL_REPO}/${OFL_BRANCH}/fixtures/manufacturers.json`;

/** Full repo file list — avoids GitHub REST rate limits (one request vs one per manufacturer). */
export const OFL_JSDELIVR_FLAT_URL = `https://data.jsdelivr.com/v1/package/gh/${OFL_REPO}@${OFL_BRANCH}/flat`;

export function oflFixtureRawUrl(manufacturerKey: string, fixtureKey: string): string {
  return `https://raw.githubusercontent.com/${OFL_REPO}/${OFL_BRANCH}/fixtures/${encodeURIComponent(manufacturerKey)}/${encodeURIComponent(fixtureKey)}.json`;
}

export function oflFixturePageUrl(manufacturerKey: string, fixtureKey: string): string {
  return `https://open-fixture-library.org/${encodeURIComponent(manufacturerKey)}/${encodeURIComponent(fixtureKey)}`;
}

/** Fixture categories from the Open Fixture Library schema. */
export const OFL_FIXTURE_CATEGORIES = [
  "Barrel Scanner",
  "Blinder",
  "Color Changer",
  "Dimmer",
  "Effect",
  "Fan",
  "Flower",
  "Hazer",
  "Laser",
  "Matrix",
  "Moving Head",
  "Pixel Bar",
  "Scanner",
  "Smoke",
  "Stand",
  "Strobe",
  "Other",
] as const;

export type OflFixtureCategory = (typeof OFL_FIXTURE_CATEGORIES)[number];

export const OFL_ALL_MANUFACTURERS = "";
export const OFL_ALL_CATEGORIES = "";
