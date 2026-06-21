export const GITHUB_REPO_URL = "https://github.com/grantler-instruments/gsc";

export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;

export const GITHUB_EXPERIMENTAL_RELEASE_URL = `${GITHUB_REPO_URL}/releases/tag/experimental`;

export const GITHUB_TAGS_API_URL = "https://api.github.com/repos/grantler-instruments/gsc/tags";

export const GITHUB_COMPARE_EXPERIMENTAL_URL =
  "https://api.github.com/repos/grantler-instruments/gsc/compare/main...experimental";

export function githubReleaseUrl(version: string): string {
  return `${GITHUB_REPO_URL}/releases/tag/${version}`;
}

export const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/thomasgeissl";

export const BUY_ME_A_COFFEE_BUTTON_URL =
  "https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png";
