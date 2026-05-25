import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "../stores/project";
import { testCue } from "../test/fixtures/cues";
import { triggerDmxCue } from "./trigger-dmx";

vi.mock("../platform/send-dmx", () => ({
  sendDmxUniverses: vi.fn(),
}));

import { sendDmxUniverses } from "../platform/send-dmx";

describe("triggerDmxCue", () => {
  beforeEach(() => {
    vi.mocked(sendDmxUniverses).mockClear();
    useProjectStore.setState({ fixtures: [] });
  });

  it("sends DMX for a configured light cue", () => {
    const cue = testCue("l", "Look", "dmx", {
      dmx: { mode: "snapshot", fixtures: [] },
    });

    expect(triggerDmxCue(cue)).toBe(true);
    expect(sendDmxUniverses).toHaveBeenCalledOnce();
  });

  it("returns false when the cue has no DMX data", () => {
    const cue = testCue("l", "Look", "dmx");

    expect(triggerDmxCue(cue)).toBe(false);
    expect(sendDmxUniverses).not.toHaveBeenCalled();
  });

  it("ignores non-dmx cues", () => {
    const cue = testCue("a", "Audio", "audio");

    expect(triggerDmxCue(cue)).toBe(false);
    expect(sendDmxUniverses).not.toHaveBeenCalled();
  });
});
