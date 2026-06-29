import { beforeEach, describe, expect, it } from "vitest";
import {
  guardDmxPreviewSelection,
  registerDmxPreviewProjectAccess,
  useDmxPreviewSessionStore,
} from "../stores/dmx-preview-session";
import { useProjectStore } from "../stores/project/store";
import { useUiStore } from "../stores/ui";
import type { Cue } from "../types/cue";

function lightCue(id: string, values: number[]): Cue {
  return {
    id,
    number: "1",
    name: id,
    type: "dmx",
    dmx: {
      mode: "partial",
      fixtures: [{ fixtureId: "a", values }],
    },
  };
}

describe("dmx preview session store", () => {
  beforeEach(() => {
    registerDmxPreviewProjectAccess(() => useProjectStore.getState());
    useProjectStore.setState({
      fixtures: [
        {
          id: "a",
          name: "Front",
          universe: 1,
          startAddress: 1,
          channelCount: 2,
        },
      ],
      cueLists: [
        {
          id: "list-1",
          name: "Main",
          cues: [lightCue("c1", [0, 0]), lightCue("c2", [0, 0])],
          selectedCueIds: ["c1"],
          selectionAnchorId: "c1",
        },
      ],
      activeCueListId: "list-1",
    });
    useUiStore.setState({ dmxPreviewCueIds: [] });
    useDmxPreviewSessionStore.setState({ session: null, confirm: null });
  });

  it("stores baseline when preview activates", () => {
    useDmxPreviewSessionStore.getState().requestActivatePreview("c1");

    expect(useUiStore.getState().dmxPreviewCueIds).toEqual(["c1"]);
    expect(useDmxPreviewSessionStore.getState().session).toEqual({
      cueId: "c1",
      baselineDmx: {
        mode: "partial",
        fixtures: [{ fixtureId: "a", values: [0, 0] }],
      },
    });
  });

  it("prompts before leaving preview with edits", () => {
    useDmxPreviewSessionStore.getState().requestActivatePreview("c1");
    useProjectStore.getState().updateCue("c1", {
      dmx: {
        mode: "partial",
        fixtures: [{ fixtureId: "a", values: [128, 0] }],
      },
    });

    expect(guardDmxPreviewSelection("c2")).toBe(false);
    expect(useDmxPreviewSessionStore.getState().confirm?.pendingAction).toEqual({
      type: "select-cue",
      cueId: "c2",
    });
  });

  it("reverts cue data when confirm resolves with revert", () => {
    useDmxPreviewSessionStore.getState().requestActivatePreview("c1");
    useProjectStore.getState().updateCue("c1", {
      dmx: {
        mode: "partial",
        fixtures: [{ fixtureId: "a", values: [128, 0] }],
      },
    });
    useDmxPreviewSessionStore.getState().requestDeactivatePreview("c1");

    useDmxPreviewSessionStore.getState().resolveConfirm(false);

    expect(useProjectStore.getState().cueLists[0].cues.find((cue) => cue.id === "c1")?.dmx).toEqual(
      {
        mode: "partial",
        fixtures: [{ fixtureId: "a", values: [0, 0] }],
      },
    );
    expect(useUiStore.getState().dmxPreviewCueIds).toEqual([]);
  });
});
