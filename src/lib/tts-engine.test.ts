import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPlatform } from "../platform";
import { generateSpeechWav as generateKokoroSpeechWav } from "./kokoro-engine";
import { generateSpeechWav, getActiveSpeechBackendLabel } from "./tts-engine";

vi.mock("../platform", () => ({
  getPlatform: vi.fn(() => "web"),
}));

vi.mock("./kokoro-engine", () => ({
  generateSpeechWav: vi.fn(
    async () => new Blob([new Uint8Array([1, 2, 3])], { type: "audio/wav" }),
  ),
  getLoadedKokoroDevice: vi.fn(() => "webgpu"),
}));

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

describe("tts-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPlatform).mockReturnValue("web");
    invoke.mockReset();
  });

  it("uses Kokoro on web with resolved voice", async () => {
    const blob = await generateSpeechWav({
      text: "Hello",
      voice: "M1", // invalid for Kokoro → af_heart
      speed: 1.1,
      lang: "de",
    });

    expect(generateKokoroSpeechWav).toHaveBeenCalledWith({
      text: "Hello",
      voice: "af_heart",
      speed: 1.1,
      onPhase: undefined,
    });
    expect(invoke).not.toHaveBeenCalled();
    expect(blob.type).toBe("audio/wav");
  });

  it("uses Supertonic on desktop with resolved lang/voice", async () => {
    vi.mocked(getPlatform).mockReturnValue("tauri");
    invoke.mockImplementation(async (cmd: string) => {
      if (cmd === "supertonic_load") return undefined;
      if (cmd === "tts_synthesize") return new Uint8Array([9, 8, 7]);
      throw new Error(`unexpected command ${cmd}`);
    });

    const phases: string[] = [];
    const blob = await generateSpeechWav({
      text: "Hallo",
      voice: "af_heart", // invalid for Supertonic → M1
      lang: "de",
      speed: 1.05,
      onPhase: (phase) => phases.push(phase),
    });

    expect(generateKokoroSpeechWav).not.toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith("supertonic_load");
    expect(invoke).toHaveBeenCalledWith("tts_synthesize", {
      text: "Hallo",
      lang: "de",
      voice: "M1",
      speed: 1.05,
    });
    expect(phases).toEqual(["loading-model", "synthesizing"]);
    expect(blob.type).toBe("audio/wav");
    expect(await blob.arrayBuffer()).toEqual(new Uint8Array([9, 8, 7]).buffer);
  });

  it("reports active backend label by platform", () => {
    vi.mocked(getPlatform).mockReturnValue("web");
    expect(getActiveSpeechBackendLabel()).toBe("webgpu");

    vi.mocked(getPlatform).mockReturnValue("tauri");
    expect(getActiveSpeechBackendLabel()).toBe("supertonic");
  });
});
