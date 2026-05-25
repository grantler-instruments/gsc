import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "../stores/project";
import { initialProjectData } from "../stores/project/initial-state";
import { useVfsStore } from "../stores/vfs";
import {
  persistProjectSession,
  resetProjectSessionForTests,
  restoreProjectSessionOnce,
} from "./project-session";

const SESSION_KEY = "gsc-project-session";
const storage = new Map<string, string>();

describe("project-session", () => {
  beforeEach(() => {
    resetProjectSessionForTests();
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
    useProjectStore.setState(initialProjectData);
    useVfsStore.setState({ entries: [] });
  });

  it("persists and restores the active project snapshot", async () => {
    useProjectStore.setState({ name: "Saved Show" });

    persistProjectSession();

    const raw = localStorage.getItem(SESSION_KEY);
    expect(raw).toContain("Saved Show");

    useProjectStore.setState({ name: "Temporary Change" });
    await restoreProjectSessionOnce();

    expect(useProjectStore.getState().name).toBe("Saved Show");
  });

  it("shares one restore promise across concurrent callers", async () => {
    useProjectStore.setState({ name: "Shared Restore" });
    persistProjectSession();
    useProjectStore.setState({ name: "Before Restore" });

    const first = restoreProjectSessionOnce();
    const second = restoreProjectSessionOnce();

    await Promise.all([first, second]);

    expect(useProjectStore.getState().name).toBe("Shared Restore");
  });

  it("ignores invalid session data", async () => {
    localStorage.setItem(SESSION_KEY, "{not-json");
    useProjectStore.setState({ name: "Current Show" });

    await restoreProjectSessionOnce();

    expect(useProjectStore.getState().name).toBe("Current Show");
  });
});
