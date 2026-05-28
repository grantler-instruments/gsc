import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetTestProject, testCue } from "../test/fixtures/cues";
import { useProjectStore } from "../stores/project";

const sendRemoteCommand = vi.fn();

vi.mock("../platform/remote-mode", () => ({
  isRemoteClient: () => true,
}));

vi.mock("./remote-client", () => ({
  sendRemoteCommand: (...args: unknown[]) => sendRemoteCommand(...args),
}));

describe("triggerGoSelected (remote client)", () => {
  beforeEach(() => {
    sendRemoteCommand.mockClear();
    resetTestProject([testCue("a", "A", "midi"), testCue("b", "B", "midi")]);
    useProjectStore.getState().selectCue("a");
  });

  it("sends go with the remote-selected cue id", async () => {
    const { triggerGoSelected } = await import("./transport-actions");
    triggerGoSelected();
    expect(sendRemoteCommand).toHaveBeenCalledWith({ action: "go", cueId: "a" });
  });
});
