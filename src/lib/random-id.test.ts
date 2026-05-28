import { describe, expect, it } from "vitest";
import { randomId } from "./random-id";

describe("randomId", () => {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it("returns a UUID v4-shaped string", () => {
    expect(randomId()).toMatch(uuidRe);
  });

  it("works without crypto.getRandomValues", () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
    });

    try {
      expect(randomId()).toMatch(uuidRe);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: original,
        configurable: true,
      });
    }
  });
});
