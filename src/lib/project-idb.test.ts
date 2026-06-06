import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "../stores/project";
import { initialProjectData } from "../stores/project/initial-state";
import {
  idbGetActiveProjectId,
  idbGetAsset,
  idbGetProject,
  idbPutAsset,
  idbPutProject,
  idbSetActiveProjectId,
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
