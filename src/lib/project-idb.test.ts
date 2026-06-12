import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "../stores/project";
import { initialProjectData } from "../stores/project/initial-state";
import {
  idbDeleteProject,
  idbGetActiveProjectId,
  idbGetAsset,
  idbGetProject,
  idbListProjects,
  idbPutAsset,
  idbPutProject,
  idbSetActiveProjectId,
  idbTouchProjectOpened,
  initProjectIdb,
  resetProjectIdbForTests,
} from "./project-idb";
import { snapshotToCueLists } from "./project-snapshot";

describe("project-idb", () => {
  beforeEach(async () => {
    resetProjectIdbForTests();
    vi.unstubAllGlobals();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
    vi.stubGlobal("caches", undefined);

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("gsc-v1");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("deleteDatabase failed"));
      request.onblocked = () => resolve();
    });
  });

  it("stores and retrieves projects and assets", async () => {
    const loaded = snapshotToCueLists({
      ...initialProjectData,
      version: 2,
      name: "IDB Show",
    });

    await initProjectIdb();
    await idbPutProject({
      id: loaded.id,
      name: loaded.name,
      updatedAt: Date.now(),
      snapshot: loaded as never,
      assets: [],
    });
    await idbSetActiveProjectId(loaded.id);
    await idbPutAsset(loaded.id, "/assets/audio/test.wav", new Blob(["audio"]));

    expect(await idbGetProject(loaded.id)).toMatchObject({ name: "IDB Show" });
    expect(await idbGetActiveProjectId()).toBe(loaded.id);
    expect(await idbGetAsset(loaded.id, "/assets/audio/test.wav")).toBeInstanceOf(Blob);
  });

  it("lists all stored projects sorted by openedAt", async () => {
    const older = snapshotToCueLists({
      ...initialProjectData,
      version: 2,
      name: "Older Show",
    });
    const newer = snapshotToCueLists({
      ...initialProjectData,
      version: 2,
      id: "newer-show",
      name: "Newer Show",
    });

    await initProjectIdb();
    await idbPutProject({
      id: older.id,
      name: older.name,
      updatedAt: 200,
      openedAt: 100,
      snapshot: older as never,
      assets: [],
    });
    await idbPutProject({
      id: newer.id,
      name: newer.name,
      updatedAt: 100,
      openedAt: 200,
      snapshot: newer as never,
      assets: [],
    });

    expect(await idbListProjects()).toEqual([
      { id: newer.id, name: "Newer Show", updatedAt: 100, openedAt: 200 },
      { id: older.id, name: "Older Show", updatedAt: 200, openedAt: 100 },
    ]);
  });

  it("updates openedAt without changing updatedAt", async () => {
    const loaded = snapshotToCueLists({
      ...initialProjectData,
      version: 2,
      name: "Touch Show",
    });

    await initProjectIdb();
    await idbPutProject({
      id: loaded.id,
      name: loaded.name,
      updatedAt: 100,
      openedAt: 100,
      snapshot: loaded as never,
      assets: [],
    });

    vi.spyOn(Date, "now").mockReturnValue(500);
    await idbTouchProjectOpened(loaded.id);

    const record = await idbGetProject(loaded.id);
    expect(record?.updatedAt).toBe(100);
    expect(record?.openedAt).toBe(500);
  });

  it("deletes a stored project", async () => {
    const loaded = snapshotToCueLists({
      ...initialProjectData,
      version: 2,
      name: "Delete Me",
    });

    await initProjectIdb();
    await idbPutProject({
      id: loaded.id,
      name: loaded.name,
      updatedAt: Date.now(),
      snapshot: loaded as never,
      assets: [],
    });

    await idbDeleteProject(loaded.id);

    expect(await idbGetProject(loaded.id)).toBeUndefined();
    expect(await idbListProjects()).toEqual([]);
  });

  it("migrates legacy localStorage session on first init", async () => {
    const snapshot = {
      ...useProjectStore.getState().getSnapshot(),
      id: "legacy-project",
      name: "Legacy Show",
    };
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() =>
        JSON.stringify({
          snapshot,
          assets: [],
        }),
      ),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    await initProjectIdb();

    expect(await idbGetActiveProjectId()).toBe("legacy-project");
    expect(await idbGetProject("legacy-project")).toMatchObject({ name: "Legacy Show" });
  });
});
