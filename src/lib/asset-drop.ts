import { isProjectBundlePath } from "./project-paths";
import { filesFromDataTransfer } from "../platform/files.web";
import { getPlatform } from "../platform";
import { openDroppedProjectBundle } from "../platform/project-storage";
import { useVfsStore } from "../stores/vfs";
import {
  isAssetDrag,
  readAssetDragData,
  type AssetDragPayload,
} from "./drag";

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
      }
      return [];
    }
  }

  const imported = await useVfsStore.getState().importFromFileList(files);
  return imported.map(({ path, name, kind }) => ({ path, name, kind }));
}
