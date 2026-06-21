import { GITHUB_COMPARE_EXPERIMENTAL_URL } from "./support-links";

interface CompareResponse {
  ahead_by: number;
}

/** True when the experimental branch has commits not yet on main. */
export async function fetchExperimentalAheadOfMain(): Promise<boolean> {
  try {
    const response = await fetch(GITHUB_COMPARE_EXPERIMENTAL_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return false;

    const data = (await response.json()) as CompareResponse;
    return data.ahead_by > 0;
  } catch {
    return false;
  }
}
