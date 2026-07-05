import { beforeEach, describe, expect, it, vi } from "vitest";

const save = vi.fn();
const exists = vi.fn();
const mkdir = vi.fn();
const notifyErrorFromUnknown = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => save(...args),
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: (...args: unknown[]) => exists(...args),
  mkdir: (...args: unknown[]) => mkdir(...args),
  readDir: vi.fn(),
  readFile: vi.fn(),
  readTextFile: vi.fn(),
  remove: vi.fn(),
  writeFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({
  appCacheDir: vi.fn(async () => "/cache"),
  join: (...parts: string[]) => parts.join("/"),
}));

vi.mock("../lib/keyboard", () => ({
  isMacPlatform: vi.fn(() => false),
}));

vi.mock("../lib/notifications", () => ({
  notifyErrorFromUnknown: (...args: unknown[]) => notifyErrorFromUnknown(...args),
  notifyWarning: vi.fn(),
  notifyWarningDeduped: vi.fn(),
}));

vi.mock("./macos-package", () => ({
  markGscProjectPackage: vi.fn(async () => {}),
}));

const { promptTauriProjectFolder } = await import("./project-storage.tauri");
const { isMacPlatform } = await import("../lib/keyboard");

describe("promptTauriProjectFolder", () => {
  beforeEach(() => {
    save.mockReset();
    exists.mockReset();
    mkdir.mockReset();
    notifyErrorFromUnknown.mockReset();
    vi.mocked(isMacPlatform).mockReturnValue(false);
    exists.mockResolvedValue(false);
    mkdir.mockResolvedValue(undefined);
  });

  it("returns null when the dialog is cancelled", async () => {
    save.mockResolvedValue(null);

    await expect(promptTauriProjectFolder("Save project as", "My Show")).resolves.toBeNull();
  });

  it("creates a new top-level project folder", async () => {
    save.mockResolvedValue("/Users/me/Shows/My_Show");

    await expect(promptTauriProjectFolder("Save project as", "My Show")).resolves.toBe(
      "/Users/me/Shows/My_Show.gsc",
    );

    expect(mkdir).toHaveBeenCalledWith("/Users/me/Shows/My_Show.gsc", { recursive: true });
  });

  it("uses an explicit default path when provided", async () => {
    save.mockResolvedValue("/Users/me/Shows/Existing_Show.gsc");

    await promptTauriProjectFolder(
      "Save project as",
      "My Show",
      "/Users/me/Shows/Existing_Show.gsc",
    );

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: "/Users/me/Shows/Existing_Show.gsc",
      }),
    );
  });

  it("rejects nested saves on non-macOS platforms", async () => {
    save.mockResolvedValue("/Users/me/Shows/Existing_Show.gsc/Nested_Show");

    await expect(promptTauriProjectFolder("Save project as", "Nested Show")).resolves.toBeNull();
    expect(notifyErrorFromUnknown).toHaveBeenCalledOnce();
    expect(mkdir).not.toHaveBeenCalled();
  });

  it("allows nested-looking paths on macOS", async () => {
    vi.mocked(isMacPlatform).mockReturnValue(true);
    save.mockResolvedValue("/Users/me/Shows/Existing_Show.gsc/Nested_Show");

    await expect(promptTauriProjectFolder("Save project as", "Nested Show")).resolves.toBe(
      "/Users/me/Shows/Existing_Show.gsc/Nested_Show.gsc",
    );
  });
});
