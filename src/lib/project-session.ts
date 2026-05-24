import { useProjectStore } from "../stores/project";
import { useVfsStore, type VfsEntry } from "../stores/vfs";
import type { AssetKind, ProjectSnapshot } from "../types/cue";
import { hydrateVfsFromProjectCache, vfsClear, vfsHas } from "../vfs/engine";
import { setActiveProjectId } from "./active-project-id";
import { notifyWarningDeduped } from "./notifications";
import { collectOflPaths } from "./ofl/import-ofl";
import { snapshotToCueLists } from "./project-snapshot";

const SESSION_KEY = "gsc-project-session";

export interface PersistedAssetEntry {
  path: string;
  name: string;
  size: number;
  mimeType: string;
  kind: AssetKind;
}

interface ProjectSession {
  snapshot: ProjectSnapshot;
  assets: PersistedAssetEntry[];
}

let restored = false;

function assetPathsFromSnapshot(snapshot: ProjectSnapshot): string[] {
  const paths = new Set<string>();
  for (const list of snapshot.cueLists) {
    for (const cue of list.cues) {
      if (cue.assetPath) paths.add(cue.assetPath);
    }
  }
  return [...paths];
}

export function collectSessionAssetPaths(
  snapshot: ProjectSnapshot,
  entries: Array<{ path: string }>,
): string[] {
  const paths = new Set(assetPathsFromSnapshot(snapshot));
  for (const entry of entries) {
    paths.add(entry.path);
  }
  for (const path of collectOflPaths(snapshot.fixtures ?? [])) {
    paths.add(path);
  }
  return [...paths];
}

export function persistProjectSession(): void {
  try {
    const snapshot = useProjectStore.getState().getSnapshot();
    if (snapshot.version !== 2) return;
    const assets: PersistedAssetEntry[] = useVfsStore
      .getState()
      .entries.map(({ path, name, size, mimeType, kind }) => ({
        path,
        name,
        size,
        mimeType,
        kind,
      }));
    const session: ProjectSession = { snapshot, assets };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn("[project-session] Could not persist session", err);
    notifyWarningDeduped("Could not save the project to browser storage.");
  }
}

function vfsEntriesFromSession(assets: PersistedAssetEntry[]): VfsEntry[] {
  return assets
    .map((asset) => ({
      ...asset,
      loaded: vfsHas(asset.path),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Restore the last autosaved project and hydrate assets from the Cache API. */
export async function restoreProjectSessionOnce(): Promise<void> {
  if (restored) return;
  restored = true;

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    setActiveProjectId(useProjectStore.getState().id);
    return;
  }

  let session: ProjectSession;
  try {
    session = JSON.parse(raw) as ProjectSession;
  } catch {
    console.warn("[project-session] Invalid session data");
    setActiveProjectId(useProjectStore.getState().id);
    return;
  }

  if (session.snapshot.version !== 2) {
    setActiveProjectId(useProjectStore.getState().id);
    return;
  }

  vfsClear();
  const loaded = snapshotToCueLists(session.snapshot);
  setActiveProjectId(loaded.id);
  useProjectStore.setState(loaded);

  const paths = collectSessionAssetPaths(session.snapshot, session.assets);
  await hydrateVfsFromProjectCache(loaded.id, paths);

  const stillMissing = session.assets.filter((asset) => !vfsHas(asset.path));
  if (stillMissing.length > 0) {
    const { resolveAssetBlob } = await import("../platform/vfs-asset");
    await Promise.all(stillMissing.map((asset) => resolveAssetBlob(asset.path)));
  }

  useVfsStore.setState({
    entries: vfsEntriesFromSession(session.assets),
  });
}
