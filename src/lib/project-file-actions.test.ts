import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectLocationStore } from "../stores/project-location";
import { saveProjectAsFile, saveProjectFile } from "./project-file-actions";

const persistPlatformProject = vi.fn(async () => {});
const exportProjectBundle = vi.fn(async () => ({ missing: [] as string[] }));
const notifyWarning = vi.fn();
let platform: "web" | "tauri" = "tauri";
let canEdit = true;

vi.mock("../platform", () => ({
  getPlatform: () => platform,
}));

vi.mock("../platform/project-storage", () => ({
  persistPlatformProject: (...args: unknown[]) => persistPlatformProject(...args),
  exportProjectBundle: (...args: unknown[]) => exportProjectBundle(...args),
}));

vi.mock("./show-mode", () => ({
  canEditProject: () => canEdit,
}));

vi.mock("./notifications", () => ({
  notifyWarning: (...args: unknown[]) => notifyWarning(...args),
}));

describe("project-file-actions save helpers", () => {
  beforeEach(() => {
    platform = "tauri";
    canEdit = true;
    persistPlatformProject.mockClear();
    exportProjectBundle.mockClear();
    notifyWarning.mockClear();
    useProjectLocationStore.setState({ rootDir: null, isTemporaryRoot: false });
  });

  it("saveProjectFile saves in place when a permanent location exists", async () => {
    useProjectLocationStore.setState({ rootDir: "/shows/saved.gsc", isTemporaryRoot: false });

    await saveProjectFile();

    expect(persistPlatformProject).toHaveBeenCalledWith({ promptForLocation: true });
  });

  it("saveProjectAsFile always prompts for a new location on desktop", async () => {
    useProjectLocationStore.setState({ rootDir: "/shows/saved.gsc", isTemporaryRoot: false });

    await saveProjectAsFile();

    expect(persistPlatformProject).toHaveBeenCalledWith({ saveAs: true });
  });

  it("saveProjectAsFile exports a bundle on web", async () => {
    platform = "web";

    await saveProjectAsFile();

    expect(exportProjectBundle).toHaveBeenCalledOnce();
    expect(persistPlatformProject).not.toHaveBeenCalled();
  });

  it("does not save when editing is disabled", async () => {
    canEdit = false;

    await saveProjectFile();
    await saveProjectAsFile();

    expect(persistPlatformProject).not.toHaveBeenCalled();
    expect(exportProjectBundle).not.toHaveBeenCalled();
  });
});
