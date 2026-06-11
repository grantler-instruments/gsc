import { getPlatform } from "../platform";
import { filesFromDataTransfer } from "../platform/files.web";
import {
  openDroppedProjectBundle,
  openDroppedProjectBundleFile,
} from "../platform/project-storage";
import { applyRenumber, patchListById } from "../stores/project/helpers";
import { useProjectStore } from "../stores/project";
import { useVfsStore } from "../stores/vfs";
import { assetKindFromFilename } from "../vfs/import";
import { isContainerCue } from "./cues";
import { type AssetDragPayload, isAssetDrag, readAssetDragData } from "./drag";
import { isProjectBundlePath } from "./project-paths";
import { canEditProject } from "./show-mode";
import type { TauriDropTarget } from "./tauri-drop";

/** True if any path looks like a media file (folders are treated as possible media). */
export function diskPathsMayHaveMedia(paths: string[]): boolean {
  return paths.some((p) => {
    if (isProjectBundlePath(p)) return false;
    const name = p.replace(/^.*[/\\]/, "");
    if (!name.includes(".")) return true;
    return assetKindFromFilename(name) !== null;
  });
}

export function isExternalFileDrag(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).some(
    (t) => t === "Files" || t === "application/x-moz-file",
  );
}

/** Asset drag from the sidebar or OS files dropped on the cue list. */
export function isAssetDropDrag(dataTransfer: DataTransfer): boolean {
  return isAssetDrag(dataTransfer) || isExternalFileDrag(dataTransfer);
}

/**
 * Resolve drop data into asset payloads. Imports OS files into the project VFS
 * when they are not already present, then returns payloads for cue creation.
 */
export async function resolveAssetDropPayloads(
  dataTransfer: DataTransfer,
): Promise<AssetDragPayload[]> {
  const fromProject = readAssetDragData(dataTransfer);
  if (fromProject) {
    return [fromProject];
  }

  const files = filesFromDataTransfer(dataTransfer);
  if (!files.length) return [];

  if (getPlatform() === "tauri") {
    const bundleFile = files.find((f) => isProjectBundlePath(f.name));
    if (bundleFile) {
      const path = (bundleFile as File & { path?: string }).path;
      if (path) {
        void openDroppedProjectBundle(path);
      } else {
        void openDroppedProjectBundleFile(bundleFile);
      }
      return [];
    }
  }

  const imported = await useVfsStore.getState().importFromFileList(files);
  return imported.map(({ path, name, kind }) => ({ path, name, kind }));
}

export type AssetDropTarget =
  | { kind: "list"; listId: string }
  | { kind: "row"; listId: string; cueId: string };

/** Apply resolved asset payloads to the cue list or a specific row. */
export function applyAssetPayloads(payloads: AssetDragPayload[], target: AssetDropTarget): void {
  if (!payloads.length || !canEditProject()) return;

  const state = useProjectStore.getState();
  const { addCues } = state;
  const list = state.cueLists.find((l) => l.id === target.listId);
  if (!list) return;
  const cues = list.cues;

  if (target.kind === "row") {
    const cue = cues.find((c) => c.id === target.cueId);
    if (!cue) {
      addCues(
        payloads.map((payload) => ({
          name: payload.name,
          type: payload.kind,
          assetPath: payload.path,
        })),
        target.listId,
      );
      return;
    }

    if (isContainerCue(cue)) {
      addCues(
        payloads.map((payload) => ({
          name: payload.name,
          type: payload.kind,
          assetPath: payload.path,
          parentId: cue.id,
        })),
        target.listId,
      );
      return;
    }

    const payload = payloads[0];
    useProjectStore.setState((s) => ({
      ...patchListById(s, target.listId, (current) => ({
        cues: applyRenumber(
          current.cues.map((c) =>
            c.id === target.cueId
              ? {
                  ...c,
                  assetPath: payload.path,
                  name: payload.name,
                  type: payload.kind,
                  midi: undefined,
                }
              : c,
          ),
        ),
        selectedCueIds: [target.cueId],
        selectionAnchorId: target.cueId,
      })),
    }));
    return;
  }

  addCues(
    payloads.map((payload) => ({
      name: payload.name,
      type: payload.kind,
      assetPath: payload.path,
    })),
    target.listId,
  );
}

/** Tauri: import dropped disk paths into the VFS and return cue payloads. */
export async function resolveAssetDropFromDiskPaths(paths: string[]): Promise<AssetDragPayload[]> {
  if (getPlatform() !== "tauri") return [];

  const { importAssetsFromDiskPaths } = await import("../platform/import-assets.tauri");
  const imported = await importAssetsFromDiskPaths(paths);
  return imported.map(({ path, name, kind }) => ({ path, name, kind }));
}

export async function handleTauriMediaDrop(
  paths: string[],
  position: { x: number; y: number },
  targetHint?: TauriDropTarget,
): Promise<void> {
  const { dropTargetAtPhysicalPosition, applyAssetDropPayloads } = await import("./tauri-drop");
  const [target, payloads] = await Promise.all([
    targetHint ? Promise.resolve(targetHint) : dropTargetAtPhysicalPosition(position),
    resolveAssetDropFromDiskPaths(paths),
  ]);
  if (!payloads.length) return;
  applyAssetDropPayloads(payloads, target);
}
