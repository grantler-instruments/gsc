/** Strip an optional leading `v` and parse `major.minor.patch`. */
export function normalizeSemver(version: string): string {
  return version.trim().replace(/^v/i, "");
}

/** True for stable release tags like `0.0.14` or `v1.2.3` (not `experimental` or prereleases). */
export function isStableReleaseTag(tag: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(normalizeSemver(tag));
}

function parseSemverParts(version: string): [number, number, number] | null {
  const normalized = normalizeSemver(version);
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(normalized);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Returns positive when `a` is newer than `b`, negative when older, 0 when equal. */
export function compareSemver(a: string, b: string): number {
  const partsA = parseSemverParts(a);
  const partsB = parseSemverParts(b);
  if (!partsA || !partsB) {
    return normalizeSemver(a).localeCompare(normalizeSemver(b));
  }
  for (let i = 0; i < 3; i++) {
    if (partsA[i] !== partsB[i]) return partsA[i] - partsB[i];
  }
  return 0;
}
