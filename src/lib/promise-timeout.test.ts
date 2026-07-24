import { describe, expect, it } from "vitest";
import { withTimeout } from "./promise-timeout";

describe("withTimeout", () => {
  it("resolves when the promise completes in time", async () => {
    await expect(withTimeout(Promise.resolve(42), 1000, "test")).resolves.toBe(42);
  });

  it("rejects when the promise exceeds the limit", async () => {
    await expect(withTimeout(new Promise(() => {}), 50, "slow task")).rejects.toThrow(
      "slow task timed out after 0s",
    );
  });
});
