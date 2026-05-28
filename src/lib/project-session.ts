import { t } from "../i18n/t";
import { useProjectStore } from "../stores/project";
import { useVfsStore, type VfsEntry } from "../stores/vfs";
import type { AssetKind, ProjectSnapshot } from "../types/cue";
import {
  flushPendingAssetCacheWrites,
  hydrateVfsFromProjectCache,
  vfsClear,
  vfsHas,
} from "../vfs/engine";
import { setActiveProjectId } from "./active-project-id";
import { notifyWarningDeduped } from "./notifications";
import { collectOflPaths } from "./ofl/import-ofl";
import { replaceProjectWithoutHistory } from "./project-history";
import { randomId } from "./random-id";
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

let restorePromise: Promise<void> | null = null;

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
    notifyWarningDeduped(t("notification.browserSaveFailed"));
  }
}

/** Flush pending asset cache writes, then persist session metadata. */
export async function persistProjectSessionAsync(): Promise<void> {
  await flushPendingAssetCacheWrites();
  persistProjectSession();
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
export function restoreProjectSessionOnce(): Promise<void> {
  if (!restorePromise) {
    restorePromise = restoreProjectSession().catch((err) => {
      restorePromise = null;
      throw err;
    });
  }
  return restorePromise;
}

async function restoreProjectSession(): Promise<void> {
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
  const projectId = loaded.id || randomId();
  if (!loaded.id) {
    loaded.id = projectId;
  }
  replaceProjectWithoutHistory(() => {
    setActiveProjectId(projectId);
    useProjectStore.setState(loaded);
  });

  const paths = collectSessionAssetPaths(session.snapshot, session.assets);
  await hydrateVfsFromProjectCache(projectId, paths);

  const stillMissing = session.assets.filter((asset) => !vfsHas(asset.path));
  if (stillMissing.length > 0) {
    const { resolveAssetBlob } = await import("../platform/vfs-asset");
    await Promise.all(stillMissing.map((asset) => resolveAssetBlob(asset.path)));
  }

  useVfsStore.setState({
    entries: vfsEntriesFromSession(session.assets),
  });
}

/** Test-only reset of internal module state. */
export function resetProjectSessionForTests(): void {
  restorePromise = null;
}
