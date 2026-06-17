import { getPlatform } from "../../platform";
import type { ProjectSnapshot } from "../../types/cue";
import { joinPath, normalizePath, vfsPut, vfsRegisterDiskPath } from "../../vfs/engine";
import { assetKindFromFilename } from "../../vfs/import";
import { VFS_ASSETS_ROOT } from "../project-paths";
import type { ImportReport } from "./import-report";
import { QLAB_MEDIA_SUBDIRS } from "./types";

export interface ResolvedAsset {
  /** Original QLab path */
  sourcePath: string;
  /** GSC virtual path */
  virtualPath: string;
  data: Uint8Array;
}

export interface AssetResolutionInput {
  snapshot: ProjectSnapshot;
  mediaBaseDir: string | null;
  /** Relative paths inside a picked project folder (web), keyed by relative path */
  folderFiles?: Map<string, Uint8Array>;
  /** Read file bytes from disk (Tauri) */
  readFile?: (absolutePath: string) => Promise<Uint8Array | null>;
  report: ImportReport;
}

function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  return normalized.split("/").pop() ?? path;
}

function stripFileUrl(path: string): string {
  if (path.startsWith("file://")) {
    try {
      return decodeURIComponent(new URL(path).pathname);
    } catch {
      return path.replace(/^file:\/\//, "");
    }
  }
  return path;
}

function joinFsPath(base: string, rel: string): string {
  const sep = base.includes("\\") ? "\\" : "/";
  const cleanBase = base.replace(/[/\\]+$/, "");
  const cleanRel = rel.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  return `${cleanBase}${sep}${cleanRel.replace(/\//g, sep)}`;
}

function virtualAssetPath(sourcePath: string): string | null {
  const name = basename(stripFileUrl(sourcePath));
  const kind = assetKindFromFilename(name);
  if (!kind) return null;
  return normalizePath(joinPath(joinPath(VFS_ASSETS_ROOT, kind), name));
}

function findInFolderFiles(
  folderFiles: Map<string, Uint8Array>,
  cleaned: string,
  fileName: string,
): Uint8Array | undefined {
  const direct = folderFiles.get(cleaned) ?? folderFiles.get(fileName);
  if (direct) return direct;

  for (const sub of QLAB_MEDIA_SUBDIRS) {
    const rel = `${sub}/${fileName}`;
    const hit = folderFiles.get(rel);
    if (hit) return hit;
  }

  for (const [key, data] of folderFiles) {
    if (key === fileName || key.endsWith(`/${fileName}`)) return data;
  }

  return undefined;
}

async function tryReadAsset(
  sourcePath: string,
  input: AssetResolutionInput,
): Promise<Uint8Array | null> {
  const cleaned = stripFileUrl(sourcePath);
  const fileName = basename(cleaned);

  if (input.folderFiles) {
    const fromFolder = findInFolderFiles(input.folderFiles, cleaned, fileName);
    if (fromFolder) return fromFolder;
  }

  if (input.readFile) {
    const abs =
      cleaned.startsWith("/") || /^[A-Za-z]:/.test(cleaned)
        ? cleaned
        : input.mediaBaseDir
          ? joinFsPath(input.mediaBaseDir, cleaned)
          : null;
    if (abs) {
      const data = await input.readFile(abs);
      if (data) return data;
    }

    if (input.mediaBaseDir) {
      const candidate = joinFsPath(input.mediaBaseDir, fileName);
      const data = await input.readFile(candidate);
      if (data) return data;
    }

    if (input.mediaBaseDir) {
      for (const sub of QLAB_MEDIA_SUBDIRS) {
        const candidate = joinFsPath(input.mediaBaseDir, `${sub}/${fileName}`);
        const data = await input.readFile(candidate);
        if (data) return data;
      }
    }
  }

  return null;
}

export async function resolveAndImportAssets(
  input: AssetResolutionInput,
): Promise<{ resolved: ResolvedAsset[]; snapshot: ProjectSnapshot }> {
  const resolved: ResolvedAsset[] = [];
  const pathRemap = new Map<string, string>();
  const missing = new Set<string>();

  const mediaPaths = new Set<string>();
  for (const list of input.snapshot.cueLists) {
    for (const cue of list.cues) {
      if (cue.assetPath) mediaPaths.add(cue.assetPath);
    }
  }

  for (const sourcePath of mediaPaths) {
    const data = await tryReadAsset(sourcePath, input);
    const virtualPath = virtualAssetPath(sourcePath);
    if (!data || !virtualPath) {
      missing.add(sourcePath);
      continue;
    }
    pathRemap.set(sourcePath, virtualPath);
    resolved.push({ sourcePath, virtualPath, data });
    vfsPut(virtualPath, new Blob([data]));
    if (getPlatform() === "tauri") {
      const { syncImportedAssetToDisk } = await import("../../platform/project-storage.tauri");
      await syncImportedAssetToDisk(virtualPath, new Blob([data]));
      vfsRegisterDiskPath(virtualPath);
    }
  }

  for (const path of missing) {
    if (!input.report.missingAssets.includes(path)) {
      input.report.missingAssets.push(path);
    }
  }

  const snapshot: ProjectSnapshot = {
    ...input.snapshot,
    cueLists: input.snapshot.cueLists.map((list) => ({
      ...list,
      cues: list.cues.map((cue) => {
        if (!cue.assetPath) return cue;
        const mapped = pathRemap.get(cue.assetPath);
        return mapped ? { ...cue, assetPath: mapped } : cue;
      }),
    })),
  };

  return { resolved, snapshot };
}

export function buildFolderFileMap(
  files: File[],
  rootPrefix = "",
): Promise<Map<string, Uint8Array>> {
  const map = new Map<string, Uint8Array>();
  const tasks: Promise<void>[] = [];

  for (const file of files) {
    const rel = rootPrefix
      ? file.webkitRelativePath.replace(rootPrefix, "").replace(/^[/\\]/, "")
      : file.webkitRelativePath || file.name;
    tasks.push(
      file.arrayBuffer().then((buf) => {
        map.set(rel.replace(/\\/g, "/"), new Uint8Array(buf));
      }),
    );
  }

  return Promise.all(tasks).then(() => map);
}
