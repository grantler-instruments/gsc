import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { AssetKind } from "../types/cue";
import { filesFromDataTransfer } from "../platform/files.web";
import { vfsAllPaths, vfsHas, vfsRemove } from "../vfs/engine";
import { clearCachedAudioBuffer } from "../audio/buffer-cache";
import { clearMediaDuration } from "../lib/media-duration";
import { assetKindFromPath, importFiles, type ImportedAsset } from "../vfs/import";

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
}

function entriesFromPaths(paths: string[]): VfsEntry[] {
  return paths.map((path) => {
    const name = path.split("/").pop() ?? path;
    return {
      path,
      name,
      size: 0,
      mimeType: "",
      kind: assetKindFromPath(path),
      loaded: vfsHas(path),
    };
  });
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
          entries: [...byPath.values()].sort((a, b) =>
            a.path.localeCompare(b.path),
          ),
        });
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
        set((s) => ({
          entries: s.entries.filter((e) => e.path !== path),
        }));
      },

      syncFromEngine: () => {
        set({ entries: entriesFromPaths(vfsAllPaths()) });
      },
    }),
    { name: "VfsStore" },
  ),
);
