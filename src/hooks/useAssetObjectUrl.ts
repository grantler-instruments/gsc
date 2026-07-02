import { useEffect, useState } from "react";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { useProjectLocationStore } from "../stores/project-location";
import { useVfsStore } from "../stores/vfs";
import { normalizePath, vfsGetObjectUrl } from "../vfs/engine";

/** Resolve a VFS asset to a blob URL (loads from disk on Tauri when needed). */
export function useAssetObjectUrl(assetPath: string | undefined): string | null {
  const projectRootDir = useProjectLocationStore((s) => s.rootDir);
  const vfsLoaded = useVfsStore((s) => {
    if (!assetPath) return false;
    const normalized = normalizePath(assetPath);
    return s.entries.find((entry) => normalizePath(entry.path) === normalized)?.loaded ?? false;
  });

  const [url, setUrl] = useState<string | null>(() =>
    assetPath ? (vfsGetObjectUrl(assetPath) ?? null) : null,
  );

  useEffect(() => {
    if (!assetPath) {
      setUrl(null);
      return;
    }

    const existing = vfsGetObjectUrl(assetPath);
    if (existing) {
      setUrl(existing);
      return;
    }

    let cancelled = false;
    void (async () => {
      await resolveAssetBlob(assetPath);
      if (cancelled) return;
      const resolved = vfsGetObjectUrl(assetPath) ?? null;
      setUrl(resolved);
      if (resolved) {
        useVfsStore.getState().refreshEntriesLoaded();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetPath, projectRootDir, vfsLoaded]);

  return url;
}
