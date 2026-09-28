import { afterEach, describe, expect, it, vi } from "vitest";
import type { CueList } from "../lib/cue-lists";
import { getMemoryPressure } from "../platform/performance-stats";
import type { Cue } from "../types/cue";
import {
  computeProtectedPaths,
  memoryShortfallBytes,
  planEviction,
  startMemoryManager,
} from "./memory-manager";

vi.mock("../platform/performance-stats", () => ({ getMemoryPressure: vi.fn() }));
const cue = (id: string): Cue => ({ id, type: "audio", assetPath: `/assets/${id}.wav` }) as Cue;
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe("media memory pressure", () => {
  it("does nothing with normal or unavailable RAM readings", () => {
    for (const availableMb of [8192, 1638.4, NaN, -1]) {
      expect(memoryShortfallBytes({ availableMb, totalMb: 16384, processMb: 0 })).toBe(0);
    }
    expect(memoryShortfallBytes({ availableMb: 0, totalMb: 0, processMb: 0 })).toBe(0);
  });
  it("targets the recovery headroom only below the low threshold", () => {
    expect(memoryShortfallBytes({ availableMb: 512, totalMb: 8192, processMb: 0 })).toBe(
      1024 * 1024 * 1024,
    );
  });
  it("protects playing, selected, upcoming and hot cues sharing asset paths", () => {
    const cues = Array.from({ length: 9 }, (_, i) => cue(String(i)));
    const lists = [
      { id: "main", cues, selectedCueIds: ["1"] },
      { id: "hot", kind: "hot", cues: [cue("hot")], selectedCueIds: [] },
    ] as CueList[];
    const protectedPaths = computeProtectedPaths({
      cueLists: lists,
      activeCueIds: ["8"],
      runningSequences: {},
    });
    expect([...protectedPaths].sort()).toEqual(
      ["1", "2", "3", "4", "5", "6", "8", "hot"].map((id) => `/assets/${id}.wav`).sort(),
    );
  });
  it("never plans protected buffers or blobs and evicts oldest first", () => {
    const candidates = [
      { path: "protected", kind: "blob" as const, bytes: 100, lastUsedMs: 0 },
      { path: "new", kind: "buffer" as const, bytes: 100, lastUsedMs: 2 },
      { path: "old", kind: "buffer" as const, bytes: 100, lastUsedMs: 1 },
    ];
    expect(planEviction(candidates, new Set(["protected"]), 100).map((c) => c.path)).toEqual([
      "old",
    ]);
  });
  it("polls only when enabled and stops on teardown", async () => {
    vi.useFakeTimers();
    vi.mocked(getMemoryPressure).mockResolvedValue(null);
    const unsubscribe = vi.fn();
    const options = {
      getProtection: () => ({ cueLists: [], activeCueIds: [], runningSequences: {} }),
      subscribe: () => unsubscribe,
      pollPressure: false,
    };
    const stopDisabled = startMemoryManager(options);
    await vi.advanceTimersByTimeAsync(10000);
    expect(getMemoryPressure).not.toHaveBeenCalled();
    stopDisabled();
    const stop = startMemoryManager({ ...options, pollPressure: true });
    await vi.advanceTimersByTimeAsync(5000);
    expect(getMemoryPressure).toHaveBeenCalledTimes(2);
    stop();
    await vi.advanceTimersByTimeAsync(10000);
    expect(getMemoryPressure).toHaveBeenCalledTimes(2);
  });
});

it("releases only unprotected buffers under measured low RAM", async () => {
  vi.useFakeTimers();
  const cache = await import("./buffer-cache");
  const entries = vi.spyOn(cache, "listAudioCacheEntries").mockReturnValue([
    { path: "/assets/playing.wav", bytes: 1024, lastUsedMs: 0 },
    { path: "/assets/old.wav", bytes: 1024, lastUsedMs: 1 },
  ]);
  const evict = vi.spyOn(cache, "evictAudioBuffer").mockReturnValue(1024);
  vi.mocked(getMemoryPressure).mockResolvedValue({
    availableMb: 4096,
    totalMb: 8192,
    processMb: 0,
  });
  const stop = startMemoryManager({
    pollPressure: true,
    subscribe: () => () => {},
    getProtection: () => ({
      cueLists: [{ id: "main", cues: [cue("playing")], selectedCueIds: [] } as unknown as CueList],
      activeCueIds: ["playing"],
      runningSequences: {},
    }),
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(evict).not.toHaveBeenCalled();
  vi.mocked(getMemoryPressure).mockResolvedValue({ availableMb: 512, totalMb: 8192, processMb: 0 });
  await vi.advanceTimersByTimeAsync(5000);
  expect(evict).toHaveBeenCalledExactlyOnceWith("/assets/old.wav");
  stop();
  entries.mockRestore();
  evict.mockRestore();
});
