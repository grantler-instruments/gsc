import { beforeEach, describe, expect, it, vi } from "vitest";
import { testCue } from "../test/fixtures/cues";
import {
  collectCuesForCopy,
  getCueClipboard,
  hasCueClipboard,
  prepareCuePaste,
  setCueClipboard,
} from "./cue-clipboard";

describe("cue clipboard storage", () => {
  beforeEach(() => {
    setCueClipboard([]);
  });

  it("stores and retrieves cloned cues", () => {
    const cue = testCue("a", "A", "midi", {
      midi: { channel: 1, kind: "note-on", note: 60, velocity: 100 },
    });
    setCueClipboard([cue]);

    expect(hasCueClipboard()).toBe(true);
    const stored = getCueClipboard();
    expect(stored).toHaveLength(1);
    expect(stored![0]).toEqual(cue);
    expect(stored![0].midi).not.toBe(cue.midi);
  });

  it("reports empty clipboard", () => {
    expect(hasCueClipboard()).toBe(false);
    expect(getCueClipboard()).toEqual([]);
  });
});

describe("collectCuesForCopy", () => {
  const cues = [
    testCue("g", "Group", "group"),
    testCue("a", "A", "audio", { parentId: "g" }),
    testCue("b", "B", "audio", { parentId: "g" }),
    testCue("c", "C", "audio"),
  ];

  it("returns nothing when nothing is selected", () => {
    expect(collectCuesForCopy([], cues)).toEqual([]);
  });

  it("copies a single cue", () => {
    const copied = collectCuesForCopy(["c"], cues);
    expect(copied.map((c) => c.id)).toEqual(["c"]);
  });

  it("includes a container subtree when the container is selected", () => {
    const copied = collectCuesForCopy(["g"], cues);
    expect(copied.map((c) => c.id)).toEqual(["g", "a", "b"]);
  });

  it("copies only selected roots when parent and child are both selected", () => {
    const copied = collectCuesForCopy(["g", "a"], cues);
    expect(copied.map((c) => c.id)).toEqual(["g", "a", "b"]);
  });

  it("copies a nested child without its parent when only the child is selected", () => {
    const copied = collectCuesForCopy(["a"], cues);
    expect(copied.map((c) => c.id)).toEqual(["a"]);
  });
});

describe("prepareCuePaste", () => {
  beforeEach(() => {
    let n = 0;
    vi.stubGlobal("crypto", {
      randomUUID: () => `paste-${++n}`,
    });
  });

  it("returns null for empty clipboard content", () => {
    expect(prepareCuePaste([], [], null)).toBeNull();
  });

  it("appends clones at the end when there is no anchor", () => {
    const source = [testCue("a", "A", "audio"), testCue("b", "B", "audio")];
    const existing = [testCue("x", "X", "audio")];

    const result = prepareCuePaste(source, existing, null);
    expect(result).not.toBeNull();
    expect(result!.cues.map((c) => c.name)).toEqual(["X", "A", "B"]);
    expect(result!.cues.map((c) => c.number)).toEqual(["1", "2", "3"]);
    expect(result!.selectedCueIds).toEqual(["paste-1", "paste-2"]);
  });

  it("inserts after the anchor subtree as a sibling with remapped ids", () => {
    const source = [testCue("g", "Group", "group"), testCue("a", "A", "audio", { parentId: "g" })];
    const existing = [
      testCue("x", "X", "audio"),
      testCue("p", "Parent", "group"),
      testCue("c", "Child", "audio", { parentId: "p" }),
      testCue("y", "Y", "audio"),
    ];

    const result = prepareCuePaste(source, existing, "p");
    expect(result).not.toBeNull();

    const names = result!.cues.map((c) => c.name);
    expect(names).toEqual(["X", "Parent", "Child", "Group", "A", "Y"]);

    const pastedGroup = result!.cues.find((c) => c.name === "Group");
    const pastedA = result!.cues.find((c) => c.name === "A");
    expect(pastedGroup?.parentId).toBeUndefined();
    expect(pastedA?.parentId).toBe(pastedGroup?.id);
    expect(result!.selectedCueIds).toEqual(["paste-1", "paste-2"]);
  });

  it("pastes into the anchor cue's parent when the anchor is nested", () => {
    const source = [testCue("a", "A", "audio")];
    const existing = [
      testCue("p", "Parent", "group"),
      testCue("c", "Child", "audio", { parentId: "p" }),
    ];

    const result = prepareCuePaste(source, existing, "c");
    expect(result).not.toBeNull();

    const pastedA = result!.cues.find((c) => c.name === "A");
    expect(pastedA?.parentId).toBe("p");
    expect(result!.cues.map((c) => c.name)).toEqual(["Parent", "Child", "A"]);
  });

  it("remaps internal stop and fade targets within the pasted set", () => {
    const source = [
      testCue("a", "A", "audio"),
      testCue("stop", "Stop", "stop", {
        stopTargetId: "a",
      }),
      testCue("fade", "Fade", "volumeFade", {
        fadeTargetId: "a",
      }),
    ];
    const existing = [testCue("x", "X", "audio")];

    const result = prepareCuePaste(source, existing, "x");
    const pastedA = result!.cues.find((c) => c.name === "A");
    const pastedStop = result!.cues.find((c) => c.name === "Stop");
    const pastedFade = result!.cues.find((c) => c.name === "Fade");

    expect(pastedStop?.stopTargetId).toBe(pastedA?.id);
    expect(pastedFade?.fadeTargetId).toBe(pastedA?.id);
  });
});
