import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLatestGitHubTag } from "./fetch-latest-github-tag";

describe("fetchLatestGitHubTag", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the highest semver tag", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ name: "0.0.6" }, { name: "0.0.8" }, { name: "0.0.7" }],
      }),
    );

    await expect(fetchLatestGitHubTag()).resolves.toBe("0.0.8");
  });

  it("ignores experimental and pre-release tags", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { name: "experimental" },
          { name: "0.0.18-experimental.4" },
          { name: "0.0.8" },
        ],
      }),
    );

    await expect(fetchLatestGitHubTag()).resolves.toBe("0.0.8");
  });

  it("returns null when only non-release tags exist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ name: "experimental" }, { name: "0.0.18-experimental.4" }],
      }),
    );

    await expect(fetchLatestGitHubTag()).resolves.toBeNull();
  });

  it("returns null when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    await expect(fetchLatestGitHubTag()).resolves.toBeNull();
  });
});
