import { compareSemver, isStableSemver } from "./compare-semver";
import { GITHUB_TAGS_API_URL } from "./support-links";

interface GitHubTag {
  name: string;
}

/** Latest semver tag from the public GitHub repository, or null when unavailable. */
export async function fetchLatestGitHubTag(): Promise<string | null> {
  try {
    const response = await fetch(`${GITHUB_TAGS_API_URL}?per_page=100`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return null;

    const tags = (await response.json()) as GitHubTag[];
    // Ignore pre-release / channel tags (e.g. `experimental`, `0.0.18-experimental.4`)
    // so they are never offered as an available update.
    const releaseTags = tags.filter((tag) => isStableSemver(tag.name));
    if (releaseTags.length === 0) return null;

    return releaseTags.reduce(
      (latest, tag) => (compareSemver(tag.name, latest) > 0 ? tag.name : latest),
      releaseTags[0].name,
    );
  } catch {
    return null;
  }
}
