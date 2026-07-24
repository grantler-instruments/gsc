export const GITHUB_REPO_URL = "https://github.com/grantler-instruments/gsc";

export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;

export const GITHUB_TAGS_API_URL = "https://api.github.com/repos/grantler-instruments/gsc/tags";

export function githubReleaseUrl(version: string): string {
  return `${GITHUB_REPO_URL}/releases/tag/${version}`;
}

export const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/thomasgeissl";

export const DEEMEX_URL = "https://grantler-instruments.com/#/things/deemex";

export const BUY_ME_A_COFFEE_BUTTON_URL =
  "https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png";
