import { getPlatform } from "../../platform";
import { useProjectStore } from "../../stores/project";
import { useVfsStore } from "../../stores/vfs";
import { hydrateAllProjectAssets } from "../hydrate-project-assets";
import { openProjectSnapshot } from "../open-project";
import { replaceProjectWithoutHistory } from "../project-history";
import { snapshotToCueLists } from "../project-snapshot";
import { convertQlabWorkspaceToSnapshot } from "./convert-to-snapshot";
import type { ImportReport } from "./import-report";
import { parseQlab5Workspace, resolveQlab5Input } from "./parse-workspace";
import { buildFolderFileMap, resolveAndImportAssets } from "./resolve-assets";
import { QLAB5_WORKSPACE_EXTENSION } from "./types";

export interface Qlab5ImportInput {
  workspacePath: string;
  workspaceBytes: Uint8Array;
  mediaBaseDir?: string | null;
  folderFiles?: Map<string, Uint8Array>;
  readFile?: (absolutePath: string) => Promise<Uint8Array | null>;
}

export interface Qlab5ImportResult {
  report: ImportReport;
  projectName: string;
}

export async function importQlab5Project(input: Qlab5ImportInput): Promise<Qlab5ImportResult> {
  const { workspace, mediaBaseDir } = resolveQlab5Input(
    input.workspacePath,
    input.workspaceBytes,
    input.mediaBaseDir ?? undefined,
  );

  const { snapshot: initialSnapshot, report } = convertQlabWorkspaceToSnapshot(workspace);

  // Load cue data first so the imported project id is active before assets are cached.
  await openProjectSnapshot(initialSnapshot);

  if (getPlatform() === "tauri") {
    const { bindTemporaryProjectRoot } = await import("../../platform/project-storage");
    await bindTemporaryProjectRoot(initialSnapshot.name);
  }

  const { snapshot } = await resolveAndImportAssets({
    snapshot: useProjectStore.getState().getSnapshot(),
    mediaBaseDir,
    folderFiles: input.folderFiles,
    readFile: input.readFile,
    report,
  });

  const loaded = snapshotToCueLists(snapshot);
  replaceProjectWithoutHistory(() => {
    useProjectStore.setState(loaded);
  });

  if (getPlatform() === "tauri") {
    const { persistPlatformProject } = await import("../../platform/project-storage");
    await persistPlatformProject();
  } else {
    const { persistProjectSessionAsync } = await import("../project-session");
    await persistProjectSessionAsync();
  }

  await hydrateAllProjectAssets(loaded.id);
  useVfsStore.getState().syncFromEngine();

  return { report, projectName: snapshot.name };
}

export function isQlab5WorkspacePath(path: string): boolean {
  return path.toLowerCase().endsWith(QLAB5_WORKSPACE_EXTENSION);
}

export function findQlab5WorkspaceInFolderFiles(files: Map<string, Uint8Array>): {
  path: string;
  bytes: Uint8Array;
} | null {
  for (const [path, bytes] of files) {
    if (isQlab5WorkspacePath(path)) {
      return { path, bytes };
    }
  }
  return null;
}

export async function importQlab5FromFolderFiles(
  files: File[],
  rootPrefix?: string,
): Promise<Qlab5ImportResult | null> {
  const folderFiles = await buildFolderFileMap(files, rootPrefix);
  const workspace = findQlab5WorkspaceInFolderFiles(folderFiles);
  if (!workspace) return null;
  return importQlab5Project({
    workspacePath: workspace.path,
    workspaceBytes: workspace.bytes,
    folderFiles,
  });
}

export function parseQlab5WorkspaceFile(bytes: Uint8Array, path: string) {
  return parseQlab5Workspace(bytes, path);
}
