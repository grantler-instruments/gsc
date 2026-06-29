import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePreferencesStore } from "../stores/preferences";

let platform: "tauri" | "web" = "tauri";

vi.mock("./index", () => ({
  getPlatform: () => platform,
}));
vi.mock("./send-dmx.tauri", () => ({
  sendDmxUniversesTauri: vi.fn(),
}));
vi.mock("./enttec-pro", () => ({
  sendEnttecProUniverses: vi.fn(),
}));

import { sendEnttecProUniverses } from "./enttec-pro";
import { sendDmxUniverses } from "./send-dmx";
import { sendDmxUniversesTauri } from "./send-dmx.tauri";

describe("sendDmxUniverses", () => {
  beforeEach(() => {
    platform = "tauri";
    vi.mocked(sendDmxUniversesTauri).mockClear();
    vi.mocked(sendEnttecProUniverses).mockClear();
    usePreferencesStore.setState({
      dmxOutputBackend: "artnet",
      artNetHost: "10.0.0.5",
      artNetPort: 6454,
    });
  });

  it("does nothing for empty frames", async () => {
    await sendDmxUniverses([]);

    expect(sendDmxUniversesTauri).not.toHaveBeenCalled();
    expect(sendEnttecProUniverses).not.toHaveBeenCalled();
  });

  it("routes to Art-Net on desktop when configured", async () => {
    const frames = [{ universe: 1, data: new Uint8Array([255]) }];

    await sendDmxUniverses(frames);

    expect(sendDmxUniversesTauri).toHaveBeenCalledOnce();
    expect(sendDmxUniversesTauri).toHaveBeenCalledWith(frames, "10.0.0.5", 6454);
    expect(sendEnttecProUniverses).not.toHaveBeenCalled();
  });

  it("uses preference host and port over defaults", async () => {
    usePreferencesStore.setState({
      artNetHost: "192.168.0.99",
      artNetPort: 7000,
    });

    await sendDmxUniverses([{ universe: 1, data: new Uint8Array([1]) }], "127.0.0.1", 6454);

    expect(sendDmxUniversesTauri).toHaveBeenCalledWith(
      [{ universe: 1, data: new Uint8Array([1]) }],
      "192.168.0.99",
      7000,
    );
  });

  it("routes to Enttec Pro when configured", async () => {
    usePreferencesStore.setState({ dmxOutputBackend: "enttec-pro" });
    const frames = [{ universe: 1, data: new Uint8Array([128]) }];

    await sendDmxUniverses(frames);

    expect(sendEnttecProUniverses).toHaveBeenCalledOnce();
    expect(sendEnttecProUniverses).toHaveBeenCalledWith(frames);
    expect(sendDmxUniversesTauri).not.toHaveBeenCalled();
  });

  it("forces Enttec Pro on web even when Art-Net is selected", async () => {
    platform = "web";
    usePreferencesStore.setState({ dmxOutputBackend: "artnet" });
    const frames = [{ universe: 1, data: new Uint8Array([64]) }];

    await sendDmxUniverses(frames);

    expect(sendEnttecProUniverses).toHaveBeenCalledOnce();
    expect(sendDmxUniversesTauri).not.toHaveBeenCalled();
  });
});
