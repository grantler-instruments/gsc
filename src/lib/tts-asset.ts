import { prefetchMediaDurations } from "../lib/media-duration";
import { getPlatform } from "../platform";
import { useVfsStore } from "../stores/vfs";
import { normalizePath, vfsPut } from "../vfs/engine";

export async function importGeneratedAudioAsset(path: string, blob: Blob): Promise<void> {
  const normalized = normalizePath(path);
  vfsPut(normalized, blob);

  const name = normalized.split("/").pop() ?? normalized;
  const entry = {
    path: normalized,
    name,
    size: blob.size,
    mimeType: blob.type || "audio/wav",
    kind: "audio" as const,
    loaded: true,
  };

  const store = useVfsStore.getState();
  const byPath = new Map(store.entries.map((e) => [e.path, e]));
  byPath.set(normalized, entry);
  useVfsStore.setState({
    entries: [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path)),
  });

  prefetchMediaDurations([normalized]);

  if (getPlatform() === "tauri") {
    const { syncImportedAssetToDisk } = await import("../platform/project-storage.tauri");
    await syncImportedAssetToDisk(normalized, blob);
  } else {
    const { persistProjectSessionAsync } = await import("../lib/project-session");
    void persistProjectSessionAsync();
  }
}
