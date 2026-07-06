import { describe, expect, it } from "vitest";
import { testCue } from "../test/fixtures/cues";
import type { Fixture } from "../types/fixture";
import { createCueList } from "./cue-lists";
import { cueListsToSnapshot, snapshotToCueLists } from "./project-snapshot";

describe("project snapshot round-trip", () => {
  it("preserves cue lists and midi mappings through snapshot", () => {
    const list = createCueList("Main");
    list.cues = [
      testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav" }),
      testCue("g", "Group", "group"),
      testCue("b", "Nested", "video", {
        parentId: "g",
        assetPath: "/assets/nested.mp4",
      }),
    ];

    const snap = cueListsToSnapshot("project-1", "My Show", [list], list.id, [
      {
        id: "map-1",
        match: { channel: 1, kind: "note-on", note: 36, velocity: 127 },
        action: { type: "go-cue", cueId: "a" },
      },
    ]);

    const loaded = snapshotToCueLists(snap);
    expect(loaded.id).toBe("project-1");
    expect(loaded.name).toBe("My Show");
    expect(loaded.cueLists).toHaveLength(1);
    expect(loaded.cueLists[0].cues).toHaveLength(3);
    expect(loaded.cueLists[0].cues[0].assetPath).toBe("/assets/intro.wav");
    expect(loaded.midiMappings).toHaveLength(1);
    expect(loaded.activeCueListId).toBe(list.id);
    expect(loaded.cueLists[0].selectedCueIds).toEqual([]);
  });

  it("selects the first cue in the first cuelist when opening a project", () => {
    const first = createCueList("First");
    first.cues = [testCue("c1", "One", "audio"), testCue("c2", "Two", "audio")];
    const second = createCueList("Second");
    second.cues = [testCue("c3", "Three", "audio")];

    const snap = cueListsToSnapshot("project-1", "My Show", [first, second], second.id);
    const loaded = snapshotToCueLists(snap, { initialOpen: true });

    expect(loaded.activeCueListId).toBe(first.id);
    expect(loaded.cueLists[0].selectedCueIds).toEqual(["c1"]);
    expect(loaded.cueLists[0].selectionAnchorId).toBe("c1");
    expect(loaded.cueLists[1].selectedCueIds).toEqual([]);
  });

  it("preserves the active cuelist when restoring a session", () => {
    const first = createCueList("First");
    first.cues = [testCue("c1", "One", "audio")];
    const second = createCueList("Second");
    second.cues = [testCue("c2", "Two", "audio")];

    const snap = cueListsToSnapshot("project-1", "My Show", [first, second], second.id);
    const loaded = snapshotToCueLists(snap);

    expect(loaded.activeCueListId).toBe(second.id);
    expect(loaded.cueLists[0].selectedCueIds).toEqual([]);
    expect(loaded.cueLists[1].selectedCueIds).toEqual([]);
  });

  it("adds default midi data when loading midi cues without payload", () => {
    const list = createCueList("Main");
    list.cues = [testCue("m", "Midi", "midi")];

    const snap = cueListsToSnapshot("p", "Show", [list], list.id);
    const loaded = snapshotToCueLists(snap);
    expect(loaded.cueLists[0].cues[0].midi).toBeDefined();
    expect(loaded.cueLists[0].cues[0].midi?.channel).toBe(1);
  });

  it("preserves show metadata through snapshot", () => {
    const list = createCueList("Main");
    const snap = cueListsToSnapshot(
      "project-1",
      "Summer Tour",
      [list],
      list.id,
      [],
      [],
      undefined,
      [],
      "2026-05-27",
      "2026-06-15",
      "Opening night at the amphitheater.",
    );

    const loaded = snapshotToCueLists(snap);
    expect(loaded.name).toBe("Summer Tour");
    expect(loaded.startDate).toBe("2026-05-27");
    expect(loaded.endDate).toBe("2026-06-15");
    expect(loaded.description).toBe("Opening night at the amphitheater.");
  });

  it("maps legacy date field to startDate when loading", () => {
    const list = createCueList("Main");
    const snap = cueListsToSnapshot("project-1", "Legacy Show", [list], list.id);
    const legacy = { ...snap, date: "2026-01-01" };

    const loaded = snapshotToCueLists(legacy);
    expect(loaded.startDate).toBe("2026-01-01");
    expect(loaded.endDate).toBeUndefined();
  });

  it("preserves fixtures through snapshot", () => {
    const list = createCueList("Main");
    const fixtures: Fixture[] = [
      {
        id: "f1",
        name: "Front wash",
        universe: 1,
        startAddress: 1,
        channelCount: 3,
        ofl: {
          filePath: "/assets/fixtures/ofl/generic/rgb-par.json",
          manufacturerKey: "generic",
          manufacturer: "Generic",
          fixtureKey: "rgb-par",
          model: "RGB Par",
          modeName: "3 Channel RGB",
          channels: [{ key: "Red" }, { key: "Green" }, { key: "Blue" }],
        },
      },
    ];

    const snap = cueListsToSnapshot("project-1", "My Show", [list], list.id, [], fixtures);

    const loaded = snapshotToCueLists(snap);
    expect(loaded.fixtures).toEqual(fixtures);
  });

  it("preserves audio buses through snapshot", () => {
    const list = createCueList("Main");
    const snap = cueListsToSnapshot("project-1", "My Show", [list], list.id, [], [], undefined, [
      { id: "b1", name: "Music", volume: 0.8 },
    ]);

    const loaded = snapshotToCueLists(snap);
    expect(loaded.audioBuses).toEqual([{ id: "b1", name: "Music", volume: 0.8 }]);
  });

  it("loads legacy snapshots without audioBuses as empty buses", () => {
    const list = createCueList("Main");
    list.cues = [
      testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav" }),
      testCue("v", "Clip", "video", { assetPath: "/assets/clip.mp4" }),
    ];

    const snap = cueListsToSnapshot("legacy-1", "Legacy Show", [list], list.id);
    const { audioBuses: _removed, ...legacySnap } = snap;

    const loaded = snapshotToCueLists(legacySnap as typeof snap);
    expect(loaded.audioBuses).toEqual([]);
    expect(loaded.cueLists[0].cues).toEqual(list.cues);
  });

  it("does not write audioBuses into snapshots when the project has none", () => {
    const list = createCueList("Main");
    list.cues = [testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav" })];

    const snap = cueListsToSnapshot("legacy-1", "Legacy Show", [list], list.id);

    expect(snap).not.toHaveProperty("audioBuses");
  });

  it("strips stale cue bus assignments when loading legacy projects without buses", () => {
    const list = createCueList("Main");
    list.cues = [
      testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav", audioBusId: "removed-bus" }),
      testCue("v", "Clip", "video", { assetPath: "/assets/clip.mp4", audioBusId: "removed-bus" }),
      testCue("g", "Look", "image", { assetPath: "/assets/look.png", audioBusId: "removed-bus" }),
    ];

    const snap = cueListsToSnapshot("legacy-1", "Legacy Show", [list], list.id);
    const { audioBuses: _removed, ...legacySnap } = snap;

    const loaded = snapshotToCueLists(legacySnap as typeof snap);
    expect(loaded.audioBuses).toEqual([]);
    expect(loaded.cueLists[0].cues[0]).not.toHaveProperty("audioBusId");
    expect(loaded.cueLists[0].cues[1]).not.toHaveProperty("audioBusId");
    expect(loaded.cueLists[0].cues[2]).not.toHaveProperty("audioBusId");
  });

  it("preserves bus pan and output routing through snapshot", () => {
    const list = createCueList("Main");
    const buses = [
      { id: "b1", name: "Music", volume: 0.8, pan: -0.5 },
      { id: "b2", name: "SFX", volume: 1, outputBusId: "b1" },
    ];
    const snap = cueListsToSnapshot(
      "project-1",
      "My Show",
      [list],
      list.id,
      [],
      [],
      undefined,
      buses,
    );

    const loaded = snapshotToCueLists(snap);
    expect(loaded.audioBuses).toEqual([
      { id: "b1", name: "Music", volume: 0.8, pan: -0.5 },
      { id: "b2", name: "SFX", volume: 1, outputBusId: "b1" },
    ]);
  });

  it("preserves cue bus assignments when the assigned bus exists", () => {
    const list = createCueList("Main");
    list.cues = [
      testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav", audioBusId: "b1" }),
      testCue("v", "Clip", "video", { assetPath: "/assets/clip.mp4", audioBusId: "b1" }),
    ];
    const snap = cueListsToSnapshot("project-1", "My Show", [list], list.id, [], [], undefined, [
      { id: "b1", name: "Music", volume: 1 },
    ]);

    const loaded = snapshotToCueLists(snap);
    expect(loaded.cueLists[0].cues[0].audioBusId).toBe("b1");
    expect(loaded.cueLists[0].cues[1].audioBusId).toBe("b1");
  });

  it("re-saving a legacy project without buses still omits audioBuses", () => {
    const list = createCueList("Main");
    list.cues = [testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav" })];
    const snap = cueListsToSnapshot("legacy-1", "Legacy Show", [list], list.id);
    const { audioBuses: _removed, ...legacySnap } = snap;

    const loaded = snapshotToCueLists(legacySnap as typeof snap);
    const resaved = cueListsToSnapshot(
      loaded.id,
      loaded.name,
      loaded.cueLists,
      loaded.activeCueListId,
      loaded.midiMappings,
      loaded.fixtures,
      loaded.fixturePlot,
      loaded.audioBuses,
    );

    expect(loaded.audioBuses).toEqual([]);
    expect(resaved).not.toHaveProperty("audioBuses");
    expect(resaved.cueLists[0].cues).toEqual(list.cues);
  });

  it("preserves video buses through snapshot", () => {
    const list = createCueList("Main");
    const snap = cueListsToSnapshot(
      "project-1",
      "My Show",
      [list],
      list.id,
      [],
      [],
      undefined,
      [],
      undefined,
      undefined,
      undefined,
      [{ id: "v1", name: "Lobby", opacity: 0.8 }],
    );

    const loaded = snapshotToCueLists(snap);
    expect(loaded.videoBuses).toEqual([{ id: "v1", name: "Lobby", opacity: 0.8 }]);
  });

  it("loads legacy snapshots without videoBuses as empty buses", () => {
    const list = createCueList("Main");
    list.cues = [
      testCue("v", "Clip", "video", { assetPath: "/assets/clip.mp4", videoBusId: "removed-bus" }),
      testCue("g", "Look", "image", { assetPath: "/assets/look.png", videoBusId: "removed-bus" }),
    ];

    const snap = cueListsToSnapshot("legacy-1", "Legacy Show", [list], list.id);
    const { videoBuses: _removed, ...legacySnap } = snap;

    const loaded = snapshotToCueLists(legacySnap as typeof snap);
    expect(loaded.videoBuses).toEqual([]);
    expect(loaded.cueLists[0].cues[0]).not.toHaveProperty("videoBusId");
    expect(loaded.cueLists[0].cues[1]).not.toHaveProperty("videoBusId");
  });

  it("does not write videoBuses into snapshots when the project has none", () => {
    const list = createCueList("Main");
    list.cues = [testCue("v", "Clip", "video", { assetPath: "/assets/clip.mp4" })];

    const snap = cueListsToSnapshot("legacy-1", "Legacy Show", [list], list.id);

    expect(snap).not.toHaveProperty("videoBuses");
  });

  it("preserves cue video bus assignments when the assigned bus exists", () => {
    const list = createCueList("Main");
    list.cues = [
      testCue("v", "Clip", "video", { assetPath: "/assets/clip.mp4", videoBusId: "v1" }),
      testCue("g", "Look", "image", { assetPath: "/assets/look.png", videoBusId: "v1" }),
    ];
    const snap = cueListsToSnapshot(
      "project-1",
      "My Show",
      [list],
      list.id,
      [],
      [],
      undefined,
      [],
      undefined,
      undefined,
      undefined,
      [{ id: "v1", name: "Lobby", opacity: 1 }],
    );

    const loaded = snapshotToCueLists(snap);
    expect(loaded.cueLists[0].cues[0].videoBusId).toBe("v1");
    expect(loaded.cueLists[0].cues[1].videoBusId).toBe("v1");
  });

  it("removes video bus assignments from non-visual cues", () => {
    const list = createCueList("Main");
    list.cues = [
      testCue("a", "Intro", "audio", { assetPath: "/assets/intro.wav", videoBusId: "v1" }),
    ];
    const snap = cueListsToSnapshot(
      "project-1",
      "My Show",
      [list],
      list.id,
      [],
      [],
      undefined,
      [],
      undefined,
      undefined,
      undefined,
      [{ id: "v1", name: "Lobby", opacity: 1 }],
    );

    const loaded = snapshotToCueLists(snap);
    expect(loaded.cueLists[0].cues[0]).not.toHaveProperty("videoBusId");
  });

  it("preserves custom main output name through snapshot", () => {
    const list = createCueList("Main");
    const snap = cueListsToSnapshot(
      "project-1",
      "My Show",
      [list],
      list.id,
      [],
      [],
      undefined,
      [],
      undefined,
      undefined,
      undefined,
      [],
      "House",
    );

    const loaded = snapshotToCueLists(snap);
    expect(loaded.masterVideoOutputName).toBe("House");
  });

  it("loads legacy snapshots without masterVideoOutputName as Main", () => {
    const list = createCueList("Main");
    const snap = cueListsToSnapshot("legacy-1", "Legacy Show", [list], list.id);

    const loaded = snapshotToCueLists(snap);
    expect(loaded.masterVideoOutputName).toBe("Main");
  });
});
