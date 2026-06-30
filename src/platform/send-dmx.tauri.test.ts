import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));
vi.mock("../lib/notifications", () => ({
  notifyErrorFromUnknown: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { sendDmxUniversesTauri } from "./send-dmx.tauri";

describe("sendDmxUniversesTauri", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockClear();
    vi.mocked(invoke).mockResolvedValue(undefined);
  });

  it("sends Art-Net frames via Tauri invoke", async () => {
    await sendDmxUniversesTauri(
      [{ universe: 1, data: new Uint8Array([255, 128]) }],
      "192.168.1.10",
      6454,
    );

    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith("send_dmx", {
      host: "192.168.1.10",
      port: 6454,
      universe: 0,
      data: [255, 128],
    });
  });

  it("defaults host when blank", async () => {
    await sendDmxUniversesTauri([{ universe: 2, data: new Uint8Array([10]) }], "   ", 6454);

    expect(invoke).toHaveBeenCalledWith(
      "send_dmx",
      expect.objectContaining({
        host: "127.0.0.1",
        universe: 1,
        data: [10],
      }),
    );
  });

  it("sends each universe frame separately", async () => {
    await sendDmxUniversesTauri([
      { universe: 1, data: new Uint8Array([1]) },
      { universe: 3, data: new Uint8Array([2, 3]) },
    ]);

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenNthCalledWith(
      1,
      "send_dmx",
      expect.objectContaining({ universe: 0, data: [1] }),
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      "send_dmx",
      expect.objectContaining({ universe: 2, data: [2, 3] }),
    );
  });
});
