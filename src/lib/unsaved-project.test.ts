import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "../stores/project";
import { initialProjectData } from "../stores/project/initial-state";
import { testCue } from "../test/fixtures/cues";
import { createCueList } from "./cue-lists";
import { hasMeaningfulProjectContent, isProjectUnsaved } from "./unsaved-project";

vi.mock("../platform", () => ({
  getPlatform: () => "web",
}));

describe("unsaved-project on web", () => {
  beforeEach(() => {
    useProjectStore.setState(initialProjectData);
  });

  it("treats a blank show as saved", () => {
    expect(hasMeaningfulProjectContent()).toBe(false);
    expect(isProjectUnsaved()).toBe(false);
  });

  it("treats edited shows as unsaved", () => {
    const list = createCueList("Main");
    list.cues = [testCue("a", "A", "audio")];
    useProjectStore.setState({
      cueLists: [list],
      activeCueListId: list.id,
    });

    expect(hasMeaningfulProjectContent()).toBe(true);
    expect(isProjectUnsaved()).toBe(true);
  });
});
