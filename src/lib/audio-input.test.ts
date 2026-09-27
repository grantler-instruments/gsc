import { afterEach, describe, expect, it, vi } from "vitest";
import { openAudioInputStream } from "./audio-input";

describe("openAudioInputStream", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requests the selected input's multichannel format", async () => {
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [] });
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia, enumerateDevices: vi.fn() },
    });
    await openAudioInputStream("blackhole-id");
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        channelCount: { ideal: 64 },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        deviceId: { ideal: "blackhole-id" },
      },
    });
  });
});
