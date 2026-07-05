import { enclosingGscProjectDirPath } from "./project-paths";

export type ProjectSaveRootStrategy =
  | { type: "prompt-and-commit" }
  | { type: "use-existing"; rootDir: string }
  | { type: "use-bound-or-draft" };

/** Decide how desktop persistence should resolve the project folder. */
export function projectSaveRootStrategy(options: {
  saveAs?: boolean;
  promptForLocation?: boolean;
  rootDir: string | null;
  isTemporaryRoot: boolean;
}): ProjectSaveRootStrategy {
  if (options.saveAs) return { type: "prompt-and-commit" };

  if (options.promptForLocation) {
    if (options.rootDir && !options.isTemporaryRoot) {
      return { type: "use-existing", rootDir: options.rootDir };
    }
    return { type: "prompt-and-commit" };
  }

  return { type: "use-bound-or-draft" };
}

/** Parent project path when a nested save must be rejected, or null when allowed. */
export function nestedProjectSaveParentToReject(
  targetPath: string,
  macPlatform: boolean,
): string | null {
  if (macPlatform) return null;
  return enclosingGscProjectDirPath(targetPath);
}

export type SaveKeyboardAction = "save-as";

/** Keyboard shortcut handling for explicit save-as on desktop drafts and ⇧Save everywhere. */
export function saveKeyboardAction(input: {
  key: string;
  metaOrCtrl: boolean;
  shift: boolean;
  alt: boolean;
  canEdit: boolean;
  platform: "web" | "tauri";
  isTemporaryRoot: boolean;
}): SaveKeyboardAction | null {
  if (!input.metaOrCtrl || input.alt || input.key.toLowerCase() !== "s" || !input.canEdit) {
    return null;
  }
  if (input.shift) return "save-as";
  if (input.platform === "tauri" && input.isTemporaryRoot) return "save-as";
  return null;
}

export function shouldPromptSaveProjectAfterMetadata(options: {
  platform: "web" | "tauri";
  isTemporaryRoot: boolean;
}): boolean {
  return options.platform === "tauri" && options.isTemporaryRoot;
}

export async function runAfterShowMetadataSave(options: {
  shouldPrompt: boolean;
  projectName: string;
  requestSaveProjectNow: (name: string) => Promise<"save" | "later">;
  saveProjectAs: () => Promise<void>;
}): Promise<void> {
  if (!options.shouldPrompt) return;
  const choice = await options.requestSaveProjectNow(options.projectName);
  if (choice === "save") {
    await options.saveProjectAs();
  }
}
