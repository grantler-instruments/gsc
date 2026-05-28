import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./remote-mode", () => ({
  isRemoteClient: () => true,
  remotePinFromUrl: () => "123456",
}));

describe("buildRemoteAssetUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds asset URL on remote HTTP port with path and pin", async () => {
    vi.stubGlobal("window", {
      location: {
        protocol: "http:",
        hostname: "192.168.1.10",
        host: "192.168.1.10:1421",
        search: "?mode=remote&pin=123456&wsPort=8766",
      },
    });

    const { buildRemoteAssetUrl } = await import("./remote-asset-url");
    const url = new URL(buildRemoteAssetUrl("/assets/intro.wav"));
    expect(url.origin).toBe("http://192.168.1.10:8766");
    expect(url.pathname).toBe("/remote/asset");
    expect(url.searchParams.get("path")).toBe("/assets/intro.wav");
    expect(url.searchParams.get("pin")).toBe("123456");
  });
});
