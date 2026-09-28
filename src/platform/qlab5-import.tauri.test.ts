import { beforeEach, describe, expect, it, vi } from "vitest";

const readDir = vi.fn();

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: (...args: unknown[]) => readDir(...args),
  readFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  dirname: vi.fn(),
  join: (...parts: string[]) => parts.join("/"),
}));

const { findQlab5WorkspaceInDirectory } = await import("./qlab5-import.tauri");

describe("findQlab5WorkspaceInDirectory", () => {
  beforeEach(() => {
    readDir.mockReset();
  });

  it("returns null when the path is not a readable directory", async () => {
    readDir.mockRejectedValue(new Error("not a directory"));

    await expect(findQlab5WorkspaceInDirectory("/media/intro.mp4")).resolves.toBeNull();
  });

  it("returns the workspace in a QLab project directory", async () => {
    readDir.mockResolvedValue([{ name: "Show.qlab5" }]);

    await expect(findQlab5WorkspaceInDirectory("/shows/QLab Show")).resolves.toBe(
      "/shows/QLab Show/Show.qlab5",
    );
  });
});
