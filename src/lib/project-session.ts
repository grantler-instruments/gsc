import { t } from "../i18n/t";
import { useProjectStore } from "../stores/project";
import { useVfsStore } from "../stores/vfs";
import type { ProjectSnapshot } from "../types/cue";
import { flushPendingAssetCacheWrites, vfsClear } from "../vfs/engine";
import { setActiveProjectId, tryGetActiveProjectId } from "./active-project-id";
import { removeAllCachedAssetsForProject } from "./asset-cache";
import { hydrateAllProjectAssets } from "./hydrate-project-assets";
import { notifyWarningDeduped } from "./notifications";
import { collectOflPaths } from "./ofl/import-ofl";
import { clearOutputAssetBlobsForProject } from "./output-asset-bridge";
import { replaceProjectWithoutHistory } from "./project-history";
import {
  type IdbProjectSummary,
  idbClearActiveProjectId,
  idbDeleteProject,
  idbGetActiveProjectId,
  idbGetProject,
  idbListProjects,
  idbPutProject,
  idbSetActiveProjectId,
  idbTouchProjectOpened,
  initProjectIdb,
  type PersistedAssetEntry,
} from "./project-idb";
import { type SnapshotToCueListsOptions, snapshotToCueLists } from "./project-snapshot";
import { randomId } from "./random-id";
import { replaceWithFreshProject } from "./reset-project-runtime";
import { requestPersistentStorage } from "./storage-persistence";
import { sessionHasMeaningfulContent } from "./unsaved-project";

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

async function removeStoredProjectFromIdb(projectId: string): Promise<void> {
  const record = await idbGetProject(projectId);
  if (!record) return;

  const assetPaths = record.assets.map((asset) => asset.path);
  await removeAllCachedAssetsForProject(projectId, assetPaths);
  clearOutputAssetBlobsForProject(projectId, assetPaths);
  await idbDeleteProject(projectId);
}

async function updateActiveProjectMetaAfterRemoval(removedProjectId: string): Promise<void> {
  if ((await idbGetActiveProjectId()) !== removedProjectId) return;

  const remaining = await idbListProjects();
  if (remaining.length > 0) {
    await idbSetActiveProjectId(remaining[0].id);
    return;
  }
  await idbClearActiveProjectId();
}

async function persistToIdb(session: ProjectSession): Promise<void> {
  const projectId = session.snapshot.id || randomId();
  if (!session.snapshot.id) {
    session.snapshot.id = projectId;
  }
  const existing = await idbGetProject(projectId);
  const now = Date.now();
  await idbPutProject({
    id: projectId,
    name: session.snapshot.name,
    updatedAt: now,
    openedAt: existing?.openedAt ?? now,
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
    const session = { snapshot, assets };
    if (!sessionHasMeaningfulContent(session.snapshot, session.assets)) {
      const projectId = snapshot.id ?? tryGetActiveProjectId();
      if (projectId) {
        await removeStoredProjectFromIdb(projectId);
        await updateActiveProjectMetaAfterRemoval(projectId);
      }
      return;
    }
    await persistToIdb(session);
    void requestPersistentStorage();
  } catch (err) {
    console.warn("[project-session] Could not persist session", err);
    notifyWarningDeduped(t("notification.browserSaveFailed"));
  }
}

async function restoreFromSession(
  session: ProjectSession,
  options?: SnapshotToCueListsOptions,
): Promise<void> {
  if (session.snapshot.version !== 2) {
    setActiveProjectId(useProjectStore.getState().id);
    return;
  }

  vfsClear();
  const loaded = snapshotToCueLists(session.snapshot, options);
  const projectId = loaded.id || randomId();
  if (!loaded.id) {
    loaded.id = projectId;
  }
  replaceProjectWithoutHistory(() => {
    setActiveProjectId(projectId);
    useProjectStore.setState(loaded);
  });

  await hydrateAllProjectAssets(projectId, session.assets);
}

/** Restore the last autosaved project and hydrate assets from IndexedDB. */
export function restoreProjectSessionOnce(): Promise<void> {
  if (!restorePromise) {
    restorePromise = restoreProjectSession()
      .catch((err) => {
        throw err;
      })
      .finally(() => {
        restorePromise = null;
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
      if (sessionHasMeaningfulContent(record.snapshot, record.assets)) {
        await restoreFromSession({ snapshot: record.snapshot, assets: record.assets });
        await idbTouchProjectOpened(activeProjectId);
        return;
      }
      await removeStoredProjectFromIdb(activeProjectId);
      await updateActiveProjectMetaAfterRemoval(activeProjectId);
    }
  }

  const remaining = await listStoredProjects();
  if (remaining.length > 0) {
    await openStoredProject(remaining[0].id);
    return;
  }

  const legacy = readLegacySession();
  if (legacy && sessionHasMeaningfulContent(legacy.snapshot, legacy.assets)) {
    await restoreFromSession(legacy);
    const projectId = legacy.snapshot.id;
    if (projectId) {
      await idbTouchProjectOpened(projectId);
    }
    return;
  }

  setActiveProjectId(useProjectStore.getState().id);
}

export async function listStoredProjects(): Promise<IdbProjectSummary[]> {
  await initProjectIdb();
  const summaries = await idbListProjects();
  const stored: IdbProjectSummary[] = [];

  for (const summary of summaries) {
    const record = await idbGetProject(summary.id);
    if (!record) continue;
    if (sessionHasMeaningfulContent(record.snapshot, record.assets)) {
      stored.push(summary);
      continue;
    }
    await removeStoredProjectFromIdb(summary.id);
    await updateActiveProjectMetaAfterRemoval(summary.id);
  }

  return stored;
}

export async function openStoredProject(projectId: string): Promise<boolean> {
  await initProjectIdb();
  const record = await idbGetProject(projectId);
  if (!record) return false;
  if (!sessionHasMeaningfulContent(record.snapshot, record.assets)) {
    await removeStoredProjectFromIdb(projectId);
    await updateActiveProjectMetaAfterRemoval(projectId);
    return false;
  }
  await restoreFromSession(
    { snapshot: record.snapshot, assets: record.assets },
    { initialOpen: true },
  );
  await idbTouchProjectOpened(projectId);
  await idbSetActiveProjectId(projectId);
  return true;
}

export async function deleteStoredProject(projectId: string): Promise<boolean> {
  await initProjectIdb();
  const record = await idbGetProject(projectId);
  if (!record) return false;

  const assetPaths = record.assets.map((asset) => asset.path);
  const wasActiveInStorage = (await idbGetActiveProjectId()) === projectId;
  const isOpenInMemory = tryGetActiveProjectId() === projectId;

  await removeAllCachedAssetsForProject(projectId, assetPaths);
  clearOutputAssetBlobsForProject(projectId, assetPaths);
  await idbDeleteProject(projectId);

  const remaining = await listStoredProjects();

  if (isOpenInMemory) {
    if (remaining.length > 0) {
      await openStoredProject(remaining[0].id);
    } else {
      replaceWithFreshProject();
      await idbClearActiveProjectId();
    }
    return true;
  }

  if (wasActiveInStorage) {
    if (remaining.length > 0) {
      await idbSetActiveProjectId(remaining[0].id);
    } else {
      await idbClearActiveProjectId();
    }
  }

  return true;
}

/** Test-only reset of internal module state. */
export function resetProjectSessionForTests(): void {
  restorePromise = null;
}
