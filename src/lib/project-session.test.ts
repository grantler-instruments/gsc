import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "../stores/project";
import { initialProjectData } from "../stores/project/initial-state";
import { useVfsStore } from "../stores/vfs";
import {
  persistProjectSessionAsync,
  resetProjectSessionForTests,
  restoreProjectSessionOnce,
} from "./project-session";

const idbState = {
  activeProjectId: undefined as string | undefined,
  projects: new Map<
    string,
    { snapshot: { version: number; id: string; name: string }; assets: [] }
  >(),
};

vi.mock("./project-idb", () => ({
  initProjectIdb: vi.fn(async () => undefined),
  idbGetActiveProjectId: vi.fn(async () => idbState.activeProjectId),
  idbSetActiveProjectId: vi.fn(async (projectId: string) => {
    idbState.activeProjectId = projectId;
  }),
  idbPutProject: vi.fn(async (record: { id: string; snapshot: unknown; assets: [] }) => {
    idbState.projects.set(record.id, record as never);
    idbState.activeProjectId = record.id;
  }),
  idbGetProject: vi.fn(async (projectId: string) => idbState.projects.get(projectId)),
  idbListProjects: vi.fn(async () =>
    [...idbState.projects.entries()].map(([id, record]) => ({
      id,
      name: record.snapshot.name,
      updatedAt: 0,
      openedAt: 0,
    })),
  ),
  idbTouchProjectOpened: vi.fn(async () => undefined),
  idbDeleteProject: vi.fn(async (projectId: string) => {
    idbState.projects.delete(projectId);
  }),
  idbClearActiveProjectId: vi.fn(async () => {
    idbState.activeProjectId = undefined;
  }),
  resetProjectIdbForTests: vi.fn(),
}));

vi.mock("../vfs/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../vfs/engine")>();
  return {
    ...actual,
    flushPendingAssetCacheWrites: vi.fn(async () => undefined),
    hydrateVfsFromProjectCache: vi.fn(async () => undefined),
    vfsHas: vi.fn(() => false),
    vfsClear: vi.fn(),
  };
});

vi.mock("./storage-persistence", () => ({
  requestPersistentStorage: vi.fn(async () => true),
}));

describe("project-session", () => {
  beforeEach(() => {
    resetProjectSessionForTests();
    idbState.activeProjectId = undefined;
    idbState.projects.clear();
    useProjectStore.setState(initialProjectData);
    useVfsStore.setState({ entries: [] });
  });

  it("does not persist a blank show", async () => {
    await persistProjectSessionAsync();

    expect(idbState.projects.size).toBe(0);
    expect(idbState.activeProjectId).toBeUndefined();
  });

  it("removes a stored project when it becomes empty", async () => {
    useProjectStore.setState({ name: "Saved Show" });
    await persistProjectSessionAsync();
    expect(idbState.projects.size).toBe(1);

    useProjectStore.setState(initialProjectData);
    await persistProjectSessionAsync();

    expect(idbState.projects.size).toBe(0);
    expect(idbState.activeProjectId).toBeUndefined();
  });

  it("persists and restores the active project snapshot", async () => {
    useProjectStore.setState({ name: "Saved Show" });

    await persistProjectSessionAsync();

    expect(idbState.projects.size).toBe(1);
    const saved = [...idbState.projects.values()][0];
    expect(saved.snapshot.name).toBe("Saved Show");

    useProjectStore.setState({ name: "Temporary Change" });
    await restoreProjectSessionOnce();

    expect(useProjectStore.getState().name).toBe("Saved Show");
  });

  it("shares one restore promise across concurrent callers", async () => {
    useProjectStore.setState({ name: "Shared Restore" });
    await persistProjectSessionAsync();
    useProjectStore.setState({ name: "Before Restore" });

    const first = restoreProjectSessionOnce();
    const second = restoreProjectSessionOnce();

    await Promise.all([first, second]);

    expect(useProjectStore.getState().name).toBe("Shared Restore");
  });

  it("falls back to legacy localStorage when IDB has no active project", async () => {
    const legacySession = {
      snapshot: {
        ...useProjectStore.getState().getSnapshot(),
        name: "Legacy Show",
      },
      assets: [],
    };
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify(legacySession),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    await restoreProjectSessionOnce();

    expect(useProjectStore.getState().name).toBe("Legacy Show");
  });
});
