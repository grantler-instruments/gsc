import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPlatform } from "../platform";
import { useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";
import { activeCues, resetTestProject } from "../test/fixtures/cues";
import { DEFAULT_TTS_LANG, DEFAULT_TTS_SPEED } from "./tts";

vi.mock("../platform", () => ({
  getPlatform: vi.fn(() => "web"),
}));

describe("tts cue create defaults", () => {
  beforeEach(() => {
    useUiStore.setState({ showMode: false });
    resetTestProject([]);
    vi.mocked(getPlatform).mockReturnValue("web");
  });

  it("defaults web speech cues to Kokoro voice and English", () => {
    useProjectStore.getState().addCue({ name: "Line", type: "tts" });
    const cue = activeCues().find((c) => c.type === "tts");
    expect(cue).toMatchObject({
      ttsText: "",
      ttsVoice: "af_heart",
      ttsLang: DEFAULT_TTS_LANG,
      ttsSpeed: DEFAULT_TTS_SPEED,
      volume: 1,
      pan: 0,
    });
  });

  it("defaults desktop speech cues to Supertonic voice", () => {
    vi.mocked(getPlatform).mockReturnValue("tauri");
    useProjectStore.getState().addCue({ name: "Line", type: "tts" });
    const cue = activeCues().find((c) => c.type === "tts");
    expect(cue).toMatchObject({
      ttsText: "",
      ttsVoice: "M1",
      ttsLang: DEFAULT_TTS_LANG,
      ttsSpeed: DEFAULT_TTS_SPEED,
    });
  });
});
