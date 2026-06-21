import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchExperimentalAheadOfMain } from "./fetch-experimental-ahead-of-main";

describe("fetchExperimentalAheadOfMain", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when experimental is ahead of main", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ahead_by: 3 }),
      }),
    );

    await expect(fetchExperimentalAheadOfMain()).resolves.toBe(true);
  });

  it("returns false when branches are in sync", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ahead_by: 0 }),
      }),
    );

    await expect(fetchExperimentalAheadOfMain()).resolves.toBe(false);
  });

  it("returns false when the compare request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    await expect(fetchExperimentalAheadOfMain()).resolves.toBe(false);
  });
});
