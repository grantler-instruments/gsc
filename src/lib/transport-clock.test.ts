import { describe, expect, it } from "vitest";
import { transportNowMs } from "./transport-clock";

describe("transportNowMs", () => {
  it("returns a finite timestamp", () => {
    const now = transportNowMs();
    expect(Number.isFinite(now)).toBe(true);
    expect(now).toBeGreaterThan(0);
  });
});
