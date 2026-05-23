import { describe, expect, it } from "vitest";
import { createCueList } from "./cue-lists";
import { cueListsToSnapshot, snapshotToCueLists } from "./project-snapshot";
import { testCue } from "../test/fixtures/cues";
import type { Fixture } from "../types/fixture";

describe("project snapshot round-trip", () => {
  it("preserves cue lists and midi mappings through snapshot", () => {
    const list = createCueList("Main");
    list.cues = [
      testCue("a", "Intro", "audio", { assetPath: "assets/intro.wav" }),
      testCue("g", "Group", "group"),
      testCue("b", "Nested", "video", {
        parentId: "g",
        assetPath: "assets/nested.mp4",
      }),
    ];

    const snap = cueListsToSnapshot(
      "project-1",
      "My Show",
      [list],
      list.id,
      [
        {
          id: "map-1",
          match: { channel: 1, kind: "note-on", note: 36, velocity: 127 },
          action: { type: "go-cue", cueId: "a" },
        },
      ],
    );

    const loaded = snapshotToCueLists(snap);
    expect(loaded.id).toBe("project-1");
    expect(loaded.name).toBe("My Show");
    expect(loaded.cueLists).toHaveLength(1);
    expect(loaded.cueLists[0].cues).toHaveLength(3);
    expect(loaded.cueLists[0].cues[0].assetPath).toBe("assets/intro.wav");
    expect(loaded.midiMappings).toHaveLength(1);
    expect(loaded.activeCueListId).toBe(list.id);
  });

  it("adds default midi data when loading midi cues without payload", () => {
    const list = createCueList("Main");
    list.cues = [testCue("m", "Midi", "midi")];

    const snap = cueListsToSnapshot("p", "Show", [list], list.id);
    const loaded = snapshotToCueLists(snap);
    expect(loaded.cueLists[0].cues[0].midi).toBeDefined();
    expect(loaded.cueLists[0].cues[0].midi?.channel).toBe(1);
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
          filePath: "/project/fixtures/ofl/generic/rgb-par.json",
          manufacturerKey: "generic",
          manufacturer: "Generic",
          fixtureKey: "rgb-par",
          model: "RGB Par",
          modeName: "3 Channel RGB",
          channels: [{ key: "Red" }, { key: "Green" }, { key: "Blue" }],
        },
      },
    ];

    const snap = cueListsToSnapshot(
      "project-1",
      "My Show",
      [list],
      list.id,
      [],
      fixtures,
    );

    const loaded = snapshotToCueLists(snap);
    expect(loaded.fixtures).toEqual(fixtures);
  });
});
