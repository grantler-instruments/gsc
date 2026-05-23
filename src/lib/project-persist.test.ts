import { describe, expect, it } from "vitest";
import { testCue } from "../test/fixtures/cues";
import { createCueList } from "./cue-lists";
import { emptyFixturePlot } from "./fixture-plot";
import {
  type ProjectPersistSlice,
  projectPersistStateChanged,
  vfsPersistStateChanged,
} from "./project-persist";

function projectState(overrides: Partial<ProjectPersistSlice> = {}): ProjectPersistSlice {
  const list = createCueList("Main");
  list.cues = [testCue("a", "A", "audio")];
  list.selectedCueIds = ["a"];
  list.selectionAnchorId = "a";

  return {
    id: "project-1",
    name: "Show",
    cueLists: [list],
    activeCueListId: list.id,
    midiMappings: [],
    fixtures: [],
    fixturePlot: emptyFixturePlot(),
    ...overrides,
  };
}

describe("projectPersistStateChanged", () => {
  it("returns false when only selection changes", () => {
    const prev = projectState();
    const next: ProjectPersistSlice = {
      ...prev,
      cueLists: [
        {
          ...prev.cueLists[0],
          selectedCueIds: ["a", "b"],
          selectionAnchorId: "b",
        },
      ],
    };

    expect(projectPersistStateChanged(prev, next)).toBe(false);
  });

  it("returns true when cue data changes", () => {
    const prev = projectState();
    const next = projectState();
    next.cueLists = [
      {
        ...prev.cueLists[0],
        cues: [...prev.cueLists[0].cues, testCue("b", "B", "audio")],
      },
    ];

    expect(projectPersistStateChanged(prev, next)).toBe(true);
  });

  it("returns true when active cue list changes", () => {
    const prev = projectState();
    const other = createCueList("Backup");
    const next = projectState({
      cueLists: [...prev.cueLists, other],
      activeCueListId: other.id,
    });

    expect(projectPersistStateChanged(prev, next)).toBe(true);
  });

  it("returns true when fixtures change", () => {
    const prev = projectState();
    const next = projectState({
      fixtures: [
        {
          id: "f1",
          name: "Par 1",
          universe: 1,
          startAddress: 1,
          channelCount: 6,
        },
      ],
    });

    expect(projectPersistStateChanged(prev, next)).toBe(true);
  });
});

describe("vfsPersistStateChanged", () => {
  const entry = {
    path: "assets/a.wav",
    name: "a.wav",
    size: 100,
    mimeType: "audio/wav",
    kind: "audio" as const,
    loaded: false,
  };

  it("returns false when only loaded flag changes", () => {
    const prev = { entries: [entry] };
    const next = { entries: [{ ...entry, loaded: true }] };
    expect(vfsPersistStateChanged(prev, next)).toBe(false);
  });

  it("returns true when asset path changes", () => {
    const prev = { entries: [entry] };
    const next = {
      entries: [{ ...entry, path: "assets/b.wav", name: "b.wav" }],
    };
    expect(vfsPersistStateChanged(prev, next)).toBe(true);
  });
});
