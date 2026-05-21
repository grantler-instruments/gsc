import { useEffect, useState } from "react";
import { resolveAssetBlob } from "../platform/vfs-asset";
import { vfsGetObjectUrl } from "../vfs/engine";

/** Resolve a VFS asset to a blob URL (loads from disk on Tauri when needed). */
export function useAssetObjectUrl(assetPath: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!assetPath) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      await resolveAssetBlob(assetPath);
      if (cancelled) return;
      setUrl(vfsGetObjectUrl(assetPath) ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [assetPath]);

  return url;
}
