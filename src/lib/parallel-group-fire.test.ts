import { describe, expect, it, vi } from "vitest";
import {
  fireParallelGroupChildren,
  getParallelGroupOrderConflict,
  walkParallelGroupChildren,
} from "./parallel-group-fire";
import { testCue } from "../test/fixtures/cues";

describe("walkParallelGroupChildren", () => {
  it("stop before playback — only stop wins", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("stop", "Stop", "stop", {
        parentId: "par",
        stopTargetId: "a",
      }),
      testCue("a", "A", "audio", { parentId: "par" }),
    ];
    const stopMany = vi.fn<(ids: string[]) => void>();
    const goMany = vi.fn<(ids: string[]) => void>();
    const resolved = new Map<string, "go" | "stop">();

    const leafIds = walkParallelGroupChildren(
      cues[0],
      cues,
      resolved,
      { stopMany, goMany },
    );

    expect(stopMany).toHaveBeenCalledWith(["a"]);
    expect(leafIds).toEqual([]);
    expect(goMany).not.toHaveBeenCalled();
  });

  it("playback before stop — only GO wins", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("a", "A", "audio", { parentId: "par" }),
      testCue("stop", "Stop", "stop", {
        parentId: "par",
        stopTargetId: "a",
      }),
    ];
    const stopMany = vi.fn<(ids: string[]) => void>();
    const goMany = vi.fn<(ids: string[]) => void>();
    const resolved = new Map<string, "go" | "stop">();

    const leafIds = walkParallelGroupChildren(
      cues[0],
      cues,
      resolved,
      { stopMany, goMany },
    );

    expect(leafIds).toEqual(["a"]);
    expect(stopMany).not.toHaveBeenCalled();
  });
});

describe("fireParallelGroupChildren", () => {
  it("GOs collected leaves after the walk", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("a", "A", "audio", { parentId: "par" }),
      testCue("b", "B", "audio", { parentId: "par" }),
    ];
    const goMany = vi.fn<(ids: string[]) => void>();

    const ids = fireParallelGroupChildren(
      cues[0],
      cues,
      { goMany, stopMany: vi.fn() },
    );

    expect(ids).toEqual(["a", "b"]);
    expect(goMany).toHaveBeenCalledWith(["a", "b"]);
  });
});

describe("getParallelGroupOrderConflict", () => {
  it("detects overlapping stop and playback targets", () => {
    const cues = [
      testCue("par", "Par", "group"),
      testCue("a", "A", "audio", { parentId: "par" }),
      testCue("stop", "Stop", "stop", {
        parentId: "par",
        stopTargetId: "a",
      }),
    ];
    expect(getParallelGroupOrderConflict(cues[0], cues)).not.toBeNull();
  });

  it("returns null when stop targets something outside the group", () => {
    const cues = [
      testCue("x", "X", "audio"),
      testCue("par", "Par", "group"),
      testCue("a", "A", "audio", { parentId: "par" }),
      testCue("stop", "Stop", "stop", {
        parentId: "par",
        stopTargetId: "x",
      }),
    ];
    expect(getParallelGroupOrderConflict(cues[1], cues)).toBeNull();
  });
});
