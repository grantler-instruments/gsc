import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { clearCachedAudioBuffer } from "../audio/buffer-cache";
import { clearMediaDuration } from "../lib/media-duration";
import { getPlatform } from "../platform";
import { filesFromDataTransfer } from "../platform/files.web";
import type { AssetKind } from "../types/cue";
import { vfsAllPaths, vfsGet, vfsHas, vfsRemove } from "../vfs/engine";
import { assetKindFromPath, type ImportedAsset, importFiles } from "../vfs/import";

export interface VfsEntry {
  path: string;
  name: string;
  size: number;
  mimeType: string;
  kind: AssetKind;
  loaded: boolean;
}

interface VfsState {
  entries: VfsEntry[];
  importFromFileList: (files: FileList | File[]) => Promise<ImportedAsset[]>;
  importFromDrop: (dataTransfer: DataTransfer) => Promise<ImportedAsset[]>;
  removeEntry: (path: string) => void;
  syncFromEngine: () => void;
  refreshEntriesLoaded: () => void;
}

function entryFromPath(path: string, existing?: VfsEntry): VfsEntry {
  const blob = vfsGet(path);
  const name = path.split("/").pop() ?? path;
  return {
    path,
    name,
    size: blob?.size ?? existing?.size ?? 0,
    mimeType: blob?.type ?? existing?.mimeType ?? "",
    kind: existing?.kind ?? assetKindFromPath(path),
    loaded: vfsHas(path),
  };
}

function entriesFromPaths(paths: string[]): VfsEntry[] {
  return paths.map((path) => entryFromPath(path));
}

export const useVfsStore = create<VfsState>()(
  devtools(
    (set, get) => ({
      entries: [],

      importFromFileList: async (files) => {
        const list = files instanceof FileList ? Array.from(files) : files;
        const imported = await importFiles(list);
        const byPath = new Map(get().entries.map((e) => [e.path, e]));
        for (const asset of imported) {
          byPath.set(asset.path, { ...asset, loaded: true });
        }
        set({
          entries: [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path)),
        });
        if (getPlatform() === "tauri") {
          const { syncImportedAssetToDisk } = await import("../platform/project-storage.tauri");
          for (const asset of imported) {
            const blob = vfsGet(asset.path);
            if (blob) await syncImportedAssetToDisk(asset.path, blob);
          }
        } else if (imported.length > 0) {
          const { persistProjectSessionAsync } = await import("../lib/project-session");
          void persistProjectSessionAsync();
        }
        return imported;
      },

      importFromDrop: async (dataTransfer) => {
        const files = filesFromDataTransfer(dataTransfer);
        return get().importFromFileList(files);
      },

      removeEntry: (path) => {
        vfsRemove(path);
        clearCachedAudioBuffer(path);
        clearMediaDuration(path);
        if (getPlatform() === "tauri") {
          void import("../platform/project-storage.tauri").then(({ removeAssetFromDisk }) =>
            removeAssetFromDisk(path),
          );
        }
        set((s) => ({
          entries: s.entries.filter((e) => e.path !== path),
        }));
      },

      syncFromEngine: () => {
        set({ entries: entriesFromPaths(vfsAllPaths()) });
      },

      refreshEntriesLoaded: () => {
        set((s) => ({
          entries: s.entries
            .map((entry) => entryFromPath(entry.path, entry))
            .sort((a, b) => a.path.localeCompare(b.path)),
        }));
      },
    }),
    { name: "VfsStore" },
  ),
);
