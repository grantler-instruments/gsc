import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_RECENT_PROJECTS,
  RECENT_PROJECTS_KEY,
  readRecentProjects,
  recordRecentProject,
  removeRecentProject,
  writeRecentProjects,
} from "./recent-projects";

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("recent-projects", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  it("removeRecentProject removes a matching entry", () => {
    writeRecentProjects([
      { path: "/shows/a", name: "Show A", openedAt: 1 },
      { path: "/shows/b", name: "Show B", openedAt: 2 },
    ]);

    removeRecentProject("/shows/a");

    expect(readRecentProjects()).toEqual([{ path: "/shows/b", name: "Show B", openedAt: 2 }]);
  });

  it("removeRecentProject leaves storage unchanged for unknown paths", () => {
    const entries = [{ path: "/shows/a", name: "Show A", openedAt: 1 }];
    writeRecentProjects(entries);

    removeRecentProject("/shows/missing");

    expect(readRecentProjects()).toEqual(entries);
  });

  it("recordRecentProject moves an existing entry to the front", () => {
    recordRecentProject("/shows/a", "Show A");
    recordRecentProject("/shows/b", "Show B");
    recordRecentProject("/shows/a", "Show A (renamed)");

    expect(readRecentProjects()).toEqual([
      { path: "/shows/a", name: "Show A (renamed)", openedAt: expect.any(Number) },
      { path: "/shows/b", name: "Show B", openedAt: expect.any(Number) },
    ]);
  });

  it(`caps stored recents at ${MAX_RECENT_PROJECTS}`, () => {
    for (let i = 0; i < MAX_RECENT_PROJECTS + 2; i++) {
      recordRecentProject(`/shows/${i}`, `Show ${i}`);
    }

    const recents = readRecentProjects();
    expect(recents).toHaveLength(MAX_RECENT_PROJECTS);
    expect(recents[0]?.path).toBe(`/shows/${MAX_RECENT_PROJECTS + 1}`);
    expect(recents[MAX_RECENT_PROJECTS - 1]?.path).toBe("/shows/2");
  });

  it("persists recents under the expected storage key", () => {
    writeRecentProjects([{ path: "/shows/a", name: "Show A", openedAt: 1 }]);

    expect(localStorage.getItem(RECENT_PROJECTS_KEY)).toBe(
      JSON.stringify([{ path: "/shows/a", name: "Show A", openedAt: 1 }]),
    );
  });
});
