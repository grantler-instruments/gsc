import { describe, expect, it, vi } from "vitest";
import {
  nestedProjectSaveParentToReject,
  projectSaveRootStrategy,
  runAfterShowMetadataSave,
  saveKeyboardAction,
  shouldPromptSaveProjectAfterMetadata,
} from "./project-save-flow";

describe("projectSaveRootStrategy", () => {
  it("always prompts for save-as", () => {
    expect(
      projectSaveRootStrategy({
        saveAs: true,
        rootDir: "/shows/saved.gsc",
        isTemporaryRoot: false,
      }),
    ).toEqual({ type: "prompt-and-commit" });
  });

  it("reuses a permanent location for in-place save", () => {
    expect(
      projectSaveRootStrategy({
        promptForLocation: true,
        rootDir: "/shows/saved.gsc",
        isTemporaryRoot: false,
      }),
    ).toEqual({ type: "use-existing", rootDir: "/shows/saved.gsc" });
  });

  it("prompts when saving a draft for the first time", () => {
    expect(
      projectSaveRootStrategy({
        promptForLocation: true,
        rootDir: "/tmp/draft/show.gsc",
        isTemporaryRoot: true,
      }),
    ).toEqual({ type: "prompt-and-commit" });
  });

  it("uses bound or draft location for background autosave", () => {
    expect(
      projectSaveRootStrategy({
        rootDir: "/shows/saved.gsc",
        isTemporaryRoot: false,
      }),
    ).toEqual({ type: "use-bound-or-draft" });
  });
});

describe("nestedProjectSaveParentToReject", () => {
  it("allows nested paths on macOS", () => {
    expect(nestedProjectSaveParentToReject("/shows/Existing.gsc/Nested.gsc", true)).toBeNull();
  });

  it("rejects nested paths on other platforms", () => {
    expect(nestedProjectSaveParentToReject("/shows/Existing.gsc/Nested.gsc", false)).toBe(
      "/shows/Existing.gsc",
    );
  });
});

describe("saveKeyboardAction", () => {
  const base = {
    key: "s",
    metaOrCtrl: true,
    shift: false,
    alt: false,
    canEdit: true,
    platform: "tauri" as const,
    isTemporaryRoot: false,
  };

  it("maps Cmd/Ctrl+Shift+S to save-as", () => {
    expect(saveKeyboardAction({ ...base, shift: true })).toBe("save-as");
  });

  it("maps Cmd/Ctrl+S on a draft show to save-as", () => {
    expect(saveKeyboardAction({ ...base, isTemporaryRoot: true })).toBe("save-as");
  });

  it("ignores Cmd/Ctrl+S on a saved show", () => {
    expect(saveKeyboardAction(base)).toBeNull();
  });

  it("ignores save shortcuts in show mode", () => {
    expect(saveKeyboardAction({ ...base, canEdit: false, isTemporaryRoot: true })).toBeNull();
  });

  it("ignores save shortcuts with Alt held", () => {
    expect(saveKeyboardAction({ ...base, alt: true, isTemporaryRoot: true })).toBeNull();
  });
});

describe("shouldPromptSaveProjectAfterMetadata", () => {
  it("prompts on desktop drafts", () => {
    expect(shouldPromptSaveProjectAfterMetadata({ platform: "tauri", isTemporaryRoot: true })).toBe(
      true,
    );
  });

  it("does not prompt on saved desktop shows", () => {
    expect(
      shouldPromptSaveProjectAfterMetadata({ platform: "tauri", isTemporaryRoot: false }),
    ).toBe(false);
  });

  it("does not prompt on web", () => {
    expect(shouldPromptSaveProjectAfterMetadata({ platform: "web", isTemporaryRoot: true })).toBe(
      false,
    );
  });
});

describe("runAfterShowMetadataSave", () => {
  it("skips prompting when the show already has a permanent location", async () => {
    const requestSaveProjectNow = vi.fn();
    const saveProjectAs = vi.fn();

    await runAfterShowMetadataSave({
      shouldPrompt: false,
      projectName: "My Show",
      requestSaveProjectNow,
      saveProjectAs,
    });

    expect(requestSaveProjectNow).not.toHaveBeenCalled();
    expect(saveProjectAs).not.toHaveBeenCalled();
  });

  it("opens save-as when the user accepts the follow-up prompt", async () => {
    const requestSaveProjectNow = vi.fn(async () => "save" as const);
    const saveProjectAs = vi.fn(async () => {});

    await runAfterShowMetadataSave({
      shouldPrompt: true,
      projectName: "My Show",
      requestSaveProjectNow,
      saveProjectAs,
    });

    expect(requestSaveProjectNow).toHaveBeenCalledWith("My Show");
    expect(saveProjectAs).toHaveBeenCalledOnce();
  });

  it("does not open save-as when the user dismisses the follow-up prompt", async () => {
    const requestSaveProjectNow = vi.fn(async () => "later" as const);
    const saveProjectAs = vi.fn(async () => {});

    await runAfterShowMetadataSave({
      shouldPrompt: true,
      projectName: "My Show",
      requestSaveProjectNow,
      saveProjectAs,
    });

    expect(requestSaveProjectNow).toHaveBeenCalledWith("My Show");
    expect(saveProjectAs).not.toHaveBeenCalled();
  });
});
