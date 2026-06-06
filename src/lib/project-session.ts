import { t } from "../i18n/t";
import { useProjectStore } from "../stores/project";
import { useVfsStore, type VfsEntry } from "../stores/vfs";
import type { ProjectSnapshot } from "../types/cue";
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
import {
  idbGetActiveProjectId,
  idbGetProject,
  idbPutProject,
  idbSetActiveProjectId,
  initProjectIdb,
  type PersistedAssetEntry,
} from "./project-idb";
import { snapshotToCueLists } from "./project-snapshot";
import { randomId } from "./random-id";
import { requestPersistentStorage } from "./storage-persistence";

export type { PersistedAssetEntry };

const LEGACY_SESSION_KEY = "gsc-project-session";

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

function readLegacySession(): ProjectSession | undefined {
  if (typeof localStorage === "undefined") return undefined;
  const raw = localStorage.getItem(LEGACY_SESSION_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ProjectSession;
  } catch {
    return undefined;
  }
}

async function persistToIdb(session: ProjectSession): Promise<void> {
  const projectId = session.snapshot.id || randomId();
  if (!session.snapshot.id) {
    session.snapshot.id = projectId;
  }
  await idbPutProject({
    id: projectId,
    name: session.snapshot.name,
    updatedAt: Date.now(),
    snapshot: session.snapshot,
    assets: session.assets,
  });
  await idbSetActiveProjectId(projectId);
  setActiveProjectId(projectId);
}

export function persistProjectSession(): void {
  void persistProjectSessionAsync();
}

/** Flush pending asset writes, then persist session metadata. */
export async function persistProjectSessionAsync(): Promise<void> {
  await flushPendingAssetCacheWrites();
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
    await initProjectIdb();
    await persistToIdb({ snapshot, assets });
    void requestPersistentStorage();
  } catch (err) {
    console.warn("[project-session] Could not persist session", err);
    notifyWarningDeduped(t("notification.browserSaveFailed"));
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

async function restoreFromSession(session: ProjectSession): Promise<void> {
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

/** Restore the last autosaved project and hydrate assets from IndexedDB. */
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
  await initProjectIdb();

  const activeProjectId = await idbGetActiveProjectId();
  if (activeProjectId) {
    const record = await idbGetProject(activeProjectId);
    if (record) {
      await restoreFromSession({ snapshot: record.snapshot, assets: record.assets });
      return;
    }
  }

  const legacy = readLegacySession();
  if (legacy) {
    await restoreFromSession(legacy);
    return;
  }

  setActiveProjectId(useProjectStore.getState().id);
}

/** Test-only reset of internal module state. */
export function resetProjectSessionForTests(): void {
  restorePromise = null;
}
