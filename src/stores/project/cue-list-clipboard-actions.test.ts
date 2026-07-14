import { beforeEach, describe, expect, it } from "vitest";
import { createCueList } from "../../lib/cue-lists";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";
import { testCue } from "../../test/fixtures/cues";

function setupLists() {
  useUiStore.setState({ showMode: false });
  const main = { ...createCueList("Main"), cues: [testCue("a", "A", "audio")] };
  const second = { ...createCueList("Second"), cues: [testCue("b", "B", "audio")] };
  useProjectStore.setState({ cueLists: [main, second], activeCueListId: main.id });
  return { main, second };
}

describe("cue list clipboard actions", () => {
  beforeEach(() => {
    setupLists();
  });

  it("duplicates a list right after it with fresh ids and a copy name", () => {
    const mainId = useProjectStore.getState().cueLists[0].id;
    useProjectStore.getState().duplicateCueList(mainId);

    const lists = useProjectStore.getState().cueLists;
    expect(lists.map((l) => l.name)).toEqual(["Main", "Main copy", "Second"]);
    expect(lists[1].id).not.toBe(lists[0].id);
    expect(lists[1].cues[0].id).not.toBe(lists[0].cues[0].id);
    expect(lists[1].cues[0].name).toBe("A");
    expect(useProjectStore.getState().activeCueListId).toBe(lists[1].id);
    expect(useProjectStore.getState().mainSequenceListId).toBe(lists[1].id);
  });

  it("copies and pastes a list after the anchor", () => {
    const [mainId, secondId] = useProjectStore.getState().cueLists.map((l) => l.id);
    useProjectStore.getState().copyCueList(mainId);
    useProjectStore.getState().pasteCueList(secondId);

    const lists = useProjectStore.getState().cueLists;
    expect(lists.map((l) => l.name)).toEqual(["Main", "Second", "Main copy"]);
    expect(useProjectStore.getState().activeCueListId).toBe(lists[2].id);
  });

  it("cut removes the list, keeps it on the clipboard, and can be pasted back", () => {
    const [, secondId] = useProjectStore.getState().cueLists.map((l) => l.id);
    useProjectStore.getState().cutCueList(secondId);

    let lists = useProjectStore.getState().cueLists;
    expect(lists.map((l) => l.name)).toEqual(["Main"]);
    expect(useProjectStore.getState().activeCueListId).toBe(lists[0].id);

    useProjectStore.getState().pasteCueList();
    lists = useProjectStore.getState().cueLists;
    expect(lists.map((l) => l.name)).toEqual(["Main", "Second"]);
  });

  it("does not cut the last remaining list", () => {
    const onlyId = useProjectStore.getState().cueLists[0].id;
    useProjectStore.setState({
      cueLists: [useProjectStore.getState().cueLists[0]],
      activeCueListId: onlyId,
    });
    useProjectStore.getState().cutCueList(onlyId);
    expect(useProjectStore.getState().cueLists).toHaveLength(1);
  });
});
