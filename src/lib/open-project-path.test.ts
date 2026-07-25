import { beforeEach, describe, expect, it, vi } from "vitest";

const isQlab5ProjectFolderPath = vi.fn();

vi.mock("./qlab5-import-actions", () => ({
  confirmAndImportQlab5Path: vi.fn(),
  isQlab5ProjectFolderPath: (...args: unknown[]) => isQlab5ProjectFolderPath(...args),
}));

const { isOpenableProjectPath } = await import("./open-project-path");

describe("isOpenableProjectPath", () => {
  beforeEach(() => {
    isQlab5ProjectFolderPath.mockReset();
    isQlab5ProjectFolderPath.mockResolvedValue(false);
  });

  it("does not treat a media file as a project", async () => {
    await expect(isOpenableProjectPath("/media/intro.mp4")).resolves.toBe(false);
    expect(isQlab5ProjectFolderPath).toHaveBeenCalledWith("/media/intro.mp4");
  });

  it("recognizes a QLab project folder", async () => {
    isQlab5ProjectFolderPath.mockResolvedValue(true);

    await expect(isOpenableProjectPath("/shows/QLab Show")).resolves.toBe(true);
  });

  it.each([
    "/shows/Example.gsc",
    "/shows/Example.gsc.zip",
    "/shows/Example.qlab5",
  ])("recognizes an explicit project path: %s", async (path) => {
    await expect(isOpenableProjectPath(path)).resolves.toBe(true);
    expect(isQlab5ProjectFolderPath).not.toHaveBeenCalled();
  });
});
