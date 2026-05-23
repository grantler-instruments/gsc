import { describe, expect, it, vi } from "vitest";
import { testCue } from "../test/fixtures/cues";
import { syncCueTriggerEngine } from "./cue-trigger-engine-sync";

describe("syncCueTriggerEngine", () => {
  it("fires when a matching cue enters the active transport set", () => {
    const midi = testCue("m1", "Midi", "midi", {
      midi: { channel: 1, kind: "note-on", note: 60, velocity: 100 },
    });
    const onFire = vi.fn();
    const lastFiredAtMs = new Map<string, number>();

    syncCueTriggerEngine({
      transport: {
        activeCueIds: ["m1"],
        cueStartedAtMs: { m1: 1000 },
      },
      cues: [midi],
      cueType: "midi",
      lastFiredAtMs,
      onFire,
    });

    expect(onFire).toHaveBeenCalledOnce();
    expect(onFire).toHaveBeenCalledWith(midi);
    expect(lastFiredAtMs.get("m1")).toBe(1000);
  });

  it("does not fire twice for the same cue and startedAt on resync", () => {
    const midi = testCue("m1", "Midi", "midi");
    const onFire = vi.fn();
    const lastFiredAtMs = new Map<string, number>();
    const transport = {
      activeCueIds: ["m1"],
      cueStartedAtMs: { m1: 1000 },
    };

    syncCueTriggerEngine({
      transport,
      cues: [midi],
      cueType: "midi",
      lastFiredAtMs,
      onFire,
    });
    syncCueTriggerEngine({
      transport,
      cues: [midi],
      cueType: "midi",
      lastFiredAtMs,
      onFire,
    });

    expect(onFire).toHaveBeenCalledOnce();
  });

  it("fires again when cueStartedAtMs changes (re-GO)", () => {
    const midi = testCue("m1", "Midi", "midi");
    const onFire = vi.fn();
    const lastFiredAtMs = new Map<string, number>();

    syncCueTriggerEngine({
      transport: {
        activeCueIds: ["m1"],
        cueStartedAtMs: { m1: 1000 },
      },
      cues: [midi],
      cueType: "midi",
      lastFiredAtMs,
      onFire,
    });
    syncCueTriggerEngine({
      transport: {
        activeCueIds: ["m1"],
        cueStartedAtMs: { m1: 2000 },
      },
      cues: [midi],
      cueType: "midi",
      lastFiredAtMs,
      onFire,
    });

    expect(onFire).toHaveBeenCalledTimes(2);
  });

  it("does not fire non-matching cue types but still records startedAt", () => {
    const audio = testCue("a1", "Audio", "audio", { assetPath: "/x.wav" });
    const onFire = vi.fn();
    const lastFiredAtMs = new Map<string, number>();

    syncCueTriggerEngine({
      transport: {
        activeCueIds: ["a1"],
        cueStartedAtMs: { a1: 1000 },
      },
      cues: [audio],
      cueType: "midi",
      lastFiredAtMs,
      onFire,
    });

    expect(onFire).not.toHaveBeenCalled();
    expect(lastFiredAtMs.get("a1")).toBe(1000);
  });

  it("clears dedup state when a cue leaves the active set", () => {
    const midi = testCue("m1", "Midi", "midi");
    const onFire = vi.fn();
    const lastFiredAtMs = new Map<string, number>();

    syncCueTriggerEngine({
      transport: {
        activeCueIds: ["m1"],
        cueStartedAtMs: { m1: 1000 },
      },
      cues: [midi],
      cueType: "midi",
      lastFiredAtMs,
      onFire,
    });
    syncCueTriggerEngine({
      transport: {
        activeCueIds: [],
        cueStartedAtMs: {},
      },
      cues: [midi],
      cueType: "midi",
      lastFiredAtMs,
      onFire,
    });
    syncCueTriggerEngine({
      transport: {
        activeCueIds: ["m1"],
        cueStartedAtMs: { m1: 1000 },
      },
      cues: [midi],
      cueType: "midi",
      lastFiredAtMs,
      onFire,
    });

    expect(onFire).toHaveBeenCalledTimes(2);
    expect(lastFiredAtMs.has("m1")).toBe(true);
  });

  it("skips active cues without cueStartedAtMs", () => {
    const midi = testCue("m1", "Midi", "midi");
    const onFire = vi.fn();
    const lastFiredAtMs = new Map<string, number>();

    syncCueTriggerEngine({
      transport: {
        activeCueIds: ["m1"],
        cueStartedAtMs: {},
      },
      cues: [midi],
      cueType: "midi",
      lastFiredAtMs,
      onFire,
    });

    expect(onFire).not.toHaveBeenCalled();
    expect(lastFiredAtMs.size).toBe(0);
  });

  it("fires multiple matching cues in one sync", () => {
    const m1 = testCue("m1", "One", "midi");
    const m2 = testCue("m2", "Two", "midi");
    const onFire = vi.fn();
    const lastFiredAtMs = new Map<string, number>();

    syncCueTriggerEngine({
      transport: {
        activeCueIds: ["m1", "m2"],
        cueStartedAtMs: { m1: 100, m2: 200 },
      },
      cues: [m1, m2],
      cueType: "midi",
      lastFiredAtMs,
      onFire,
    });

    expect(onFire).toHaveBeenCalledTimes(2);
    expect(onFire).toHaveBeenNthCalledWith(1, m1);
    expect(onFire).toHaveBeenNthCalledWith(2, m2);
  });
});
