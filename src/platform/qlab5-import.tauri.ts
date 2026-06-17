import { dirname, join } from "@tauri-apps/api/path";
import { readDir, readFile } from "@tauri-apps/plugin-fs";
import {
  importQlab5Project,
  isQlab5WorkspacePath,
  type Qlab5ImportResult,
} from "../lib/qlab5/import-qlab5-project";
import { QLAB5_WORKSPACE_EXTENSION } from "../lib/qlab5/types";

async function readBytes(path: string): Promise<Uint8Array> {
  return readFile(path);
}

export async function findQlab5WorkspaceInDirectory(dirPath: string): Promise<string | null> {
  const entries = await readDir(dirPath);
  const workspaceEntry = entries.find((e) =>
    e.name?.toLowerCase().endsWith(QLAB5_WORKSPACE_EXTENSION),
  );
  if (!workspaceEntry?.name) return null;
  return join(dirPath, workspaceEntry.name);
}

async function importQlab5WorkspaceFile(
  workspacePath: string,
  mediaBaseDir?: string | null,
): Promise<Qlab5ImportResult> {
  const bytes = await readBytes(workspacePath);
  const parentDir = mediaBaseDir ?? (await dirname(workspacePath));
  return importQlab5Project({
    workspacePath,
    workspaceBytes: bytes,
    mediaBaseDir: parentDir,
    readFile: readBytes,
  });
}

export async function importQlab5AtPathTauri(path: string): Promise<Qlab5ImportResult | null> {
  if (isQlab5WorkspacePath(path)) {
    return importQlab5WorkspaceFile(path);
  }

  const workspacePath = await findQlab5WorkspaceInDirectory(path);
  if (!workspacePath) return null;
  return importQlab5WorkspaceFile(workspacePath, path);
}
