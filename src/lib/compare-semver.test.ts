import { describe, expect, it } from "vitest";
import { compareSemver, isStableReleaseTag, normalizeSemver } from "./compare-semver";

describe("normalizeSemver", () => {
  it("strips a leading v", () => {
    expect(normalizeSemver("v1.2.3")).toBe("1.2.3");
  });
});

describe("isStableReleaseTag", () => {
  it("accepts plain semver tags", () => {
    expect(isStableReleaseTag("0.0.14")).toBe(true);
    expect(isStableReleaseTag("v1.2.3")).toBe(true);
  });

  it("rejects experimental and prerelease tags", () => {
    expect(isStableReleaseTag("experimental")).toBe(false);
    expect(isStableReleaseTag("0.0.14-experimental.847")).toBe(false);
  });
});

describe("compareSemver", () => {
  it("orders patch versions", () => {
    expect(compareSemver("0.0.8", "0.0.7")).toBeGreaterThan(0);
    expect(compareSemver("0.0.7", "0.0.8")).toBeLessThan(0);
  });

  it("orders minor and major versions", () => {
    expect(compareSemver("1.0.0", "0.9.9")).toBeGreaterThan(0);
    expect(compareSemver("0.10.0", "0.9.0")).toBeGreaterThan(0);
  });

  it("treats equal versions as zero", () => {
    expect(compareSemver("0.0.7", "v0.0.7")).toBe(0);
  });
});
