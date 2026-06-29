/** Strip an optional leading `v` and parse `major.minor.patch`. */
export function normalizeSemver(version: string): string {
  return version.trim().replace(/^v/i, "");
}

function parseSemverParts(version: string): [number, number, number] | null {
  const normalized = normalizeSemver(version);
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(normalized);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * True only for plain `major.minor.patch` tags (after stripping a leading `v`).
 * Rejects pre-release / channel tags like `experimental` or `0.0.18-experimental.4`.
 */
export function isStableSemver(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(normalizeSemver(version));
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
