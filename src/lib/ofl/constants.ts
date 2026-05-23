export const OFL_REPO = "OpenLightingProject/open-fixture-library";
export const OFL_BRANCH = "master";

export const OFL_MANUFACTURERS_URL = `https://raw.githubusercontent.com/${OFL_REPO}/${OFL_BRANCH}/fixtures/manufacturers.json`;

export function oflManufacturerContentsUrl(manufacturerKey: string): string {
  return `https://api.github.com/repos/${OFL_REPO}/contents/fixtures/${encodeURIComponent(manufacturerKey)}?ref=${OFL_BRANCH}`;
}

export function oflFixtureRawUrl(manufacturerKey: string, fixtureKey: string): string {
  return `https://raw.githubusercontent.com/${OFL_REPO}/${OFL_BRANCH}/fixtures/${encodeURIComponent(manufacturerKey)}/${encodeURIComponent(fixtureKey)}.json`;
}

export function oflFixturePageUrl(manufacturerKey: string, fixtureKey: string): string {
  return `https://open-fixture-library.org/${encodeURIComponent(manufacturerKey)}/${encodeURIComponent(fixtureKey)}`;
}
