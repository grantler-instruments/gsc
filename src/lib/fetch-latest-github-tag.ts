import { compareSemver } from "./compare-semver";
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
    if (tags.length === 0) return null;

    return tags.reduce(
      (latest, tag) => (compareSemver(tag.name, latest) > 0 ? tag.name : latest),
      tags[0].name,
    );
  } catch {
    return null;
  }
}
