import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "../stores/project";
import { initialProjectData } from "../stores/project/initial-state";
import { useProjectLocationStore } from "../stores/project-location";
import { testCue } from "../test/fixtures/cues";
import { createCueList } from "./cue-lists";
import {
  hasMeaningfulProjectContent,
  isProjectUnsaved,
  sessionHasMeaningfulContent,
} from "./unsaved-project";

let platform: "web" | "tauri" = "web";

vi.mock("../platform", () => ({
  getPlatform: () => platform,
}));

describe("unsaved-project", () => {
  beforeEach(() => {
    platform = "web";
    useProjectStore.setState(initialProjectData);
    useProjectLocationStore.setState({ rootDir: null, isTemporaryRoot: false });
  });

  it("treats a blank show as saved", () => {
    const snapshot = useProjectStore.getState().getSnapshot();
    expect(sessionHasMeaningfulContent(snapshot, [])).toBe(false);
    expect(hasMeaningfulProjectContent()).toBe(false);
    expect(isProjectUnsaved()).toBe(false);
  });

  it("does not treat edited shows as unsaved on web", () => {
    const list = createCueList("Main");
    list.cues = [testCue("a", "A", "audio")];
    useProjectStore.setState({
      cueLists: [list],
      activeCueListId: list.id,
    });

    expect(hasMeaningfulProjectContent()).toBe(true);
    expect(isProjectUnsaved()).toBe(false);
  });

  it("treats draft shows as unsaved on desktop", () => {
    platform = "tauri";
    useProjectLocationStore.setState({ rootDir: "/tmp/draft", isTemporaryRoot: true });
    const list = createCueList("Main");
    list.cues = [testCue("a", "A", "audio")];
    useProjectStore.setState({
      cueLists: [list],
      activeCueListId: list.id,
    });

    expect(isProjectUnsaved()).toBe(true);
  });

  it("treats saved shows as saved on desktop", () => {
    platform = "tauri";
    useProjectLocationStore.setState({ rootDir: "/shows/my-show", isTemporaryRoot: false });
    const list = createCueList("Main");
    list.cues = [testCue("a", "A", "audio")];
    useProjectStore.setState({
      cueLists: [list],
      activeCueListId: list.id,
    });

    expect(isProjectUnsaved()).toBe(false);
  });
});
