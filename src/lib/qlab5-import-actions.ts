import { t } from "../i18n/t";
import { getPlatform } from "../platform";
import { withProjectLoading } from "../stores/project-loading";
import { requestQlab5ImportConfirm, requestQlab5ImportReport } from "../stores/qlab5-import-prompt";
import { notifyWarning } from "./notifications";
import { prepareToSwitchProject } from "./project-file-actions";
import {
  importQlab5FromFolderFiles,
  importQlab5Project,
  isQlab5WorkspacePath,
  type Qlab5ImportResult,
} from "./qlab5/import-qlab5-project";
import { QLAB5_WORKSPACE_EXTENSION } from "./qlab5/types";
import { canEditProject } from "./show-mode";

function pathLabel(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

async function finishQlab5Import(result: Qlab5ImportResult | null): Promise<boolean> {
  if (!result) {
    notifyWarning(t("qlab5Import.failed"));
    return false;
  }
  await requestQlab5ImportReport(result);
  return true;
}

async function confirmAndRun(
  label: string,
  run: () => Promise<Qlab5ImportResult | null>,
): Promise<boolean> {
  if (!canEditProject()) return false;
  const confirmed = await requestQlab5ImportConfirm(label);
  if (!confirmed) return false;
  if (!(await prepareToSwitchProject())) return false;
  return finishQlab5Import(await withProjectLoading(run));
}

/** Tauri: import a `.qlab5` file or a folder containing one. */
export async function confirmAndImportQlab5Path(path: string): Promise<boolean> {
  return confirmAndRun(pathLabel(path), () => importQlab5AtPath(path));
}

/** Web: import a picked `.qlab5` workspace file. */
export async function confirmAndImportQlab5WorkspaceFile(file: File): Promise<boolean> {
  return confirmAndRun(file.name, async () => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return importQlab5Project({
      workspacePath: file.name,
      workspaceBytes: bytes,
    });
  });
}

/** Web: import a picked QLab project folder. */
export async function confirmAndImportQlab5FolderFiles(files: File[]): Promise<boolean> {
  const label =
    files[0]?.webkitRelativePath.split("/")[0] ||
    files.find((f) => isQlab5WorkspacePath(f.name))?.name ||
    "QLab project";
  return confirmAndRun(label, () => importQlab5FromFolderFiles(files));
}

async function importQlab5AtPath(path: string): Promise<Qlab5ImportResult | null> {
  if (getPlatform() === "tauri") {
    const { importQlab5AtPathTauri } = await import("../platform/qlab5-import.tauri");
    return importQlab5AtPathTauri(path);
  }
  return null;
}

/** Tauri: detect whether a folder path contains a QLab workspace. */
export async function isQlab5ProjectFolderPath(path: string): Promise<boolean> {
  if (getPlatform() !== "tauri") return false;
  const { findQlab5WorkspaceInDirectory } = await import("../platform/qlab5-import.tauri");
  return (await findQlab5WorkspaceInDirectory(path)) !== null;
}

export function pickWebQlab5WorkspaceFile(): Promise<File | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = `.qlab5,${QLAB5_WORKSPACE_EXTENSION}`;
    input.hidden = true;
    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      resolve(file);
    };
    document.body.appendChild(input);
    input.click();
  });
}

export function pickWebQlab5ProjectFolder(): Promise<File[] | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.setAttribute("webkitdirectory", "");
    input.hidden = true;
    input.onchange = () => {
      const files = input.files ? [...input.files] : undefined;
      input.remove();
      resolve(files);
    };
    document.body.appendChild(input);
    input.click();
  });
}
