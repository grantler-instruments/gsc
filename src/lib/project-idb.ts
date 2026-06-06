import type { AssetKind, ProjectSnapshot } from "../types/cue";
import { normalizePath } from "../vfs/engine";
import { randomId } from "./random-id";

const DB_NAME = "gsc-v1";
const DB_VERSION = 1;

const STORES = {
  projects: "projects",
  assets: "assets",
  meta: "meta",
  ofl: "ofl",
} as const;

const LEGACY_SESSION_KEY = "gsc-project-session";
const LEGACY_CACHE_NAME = "gsc-assets-v1";
const LEGACY_CACHE_ORIGIN = "https://gsc-cache.local";
const MIGRATED_META_KEY = "legacyMigrated";

export interface PersistedAssetEntry {
  path: string;
  name: string;
  size: number;
  mimeType: string;
  kind: AssetKind;
}

export interface IdbProjectRecord {
  id: string;
  name: string;
  updatedAt: number;
  snapshot: ProjectSnapshot;
  assets: PersistedAssetEntry[];
}

interface IdbActiveMeta {
  lastProjectId: string;
}

interface IdbOflEntry {
  url: string;
  body: string;
  contentType: string;
  cachedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let initPromise: Promise<void> | null = null;
let activeDb: IDBDatabase | null = null;

function isIdbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!isIdbAvailable()) {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORES.projects)) {
          db.createObjectStore(STORES.projects, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.assets)) {
          db.createObjectStore(STORES.assets);
        }
        if (!db.objectStoreNames.contains(STORES.meta)) {
          db.createObjectStore(STORES.meta);
        }
        if (!db.objectStoreNames.contains(STORES.ofl)) {
          db.createObjectStore(STORES.ofl, { keyPath: "url" });
        }
      };
      request.onsuccess = () => {
        activeDb = request.result;
        resolve(request.result);
      };
      request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    });
  }
  return dbPromise;
}

function assetStoreKey(projectId: string, path: string): IDBValidKey {
  return [projectId, normalizePath(path)];
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function idbGetMeta<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  const tx = db.transaction(STORES.meta, "readonly");
  const value = await requestToPromise<T | undefined>(tx.objectStore(STORES.meta).get(key));
  await txDone(tx);
  return value;
}

async function idbSetMeta(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES.meta, "readwrite");
  tx.objectStore(STORES.meta).put(value, key);
  await txDone(tx);
}

async function idbHasAnyProject(): Promise<boolean> {
  const db = await openDb();
  const tx = db.transaction(STORES.projects, "readonly");
  const count = await requestToPromise<number>(tx.objectStore(STORES.projects).count());
  await txDone(tx);
  return count > 0;
}

export async function initProjectIdb(): Promise<void> {
  if (!isIdbAvailable()) return;
  if (!initPromise) {
    initPromise = (async () => {
      await openDb();
      await migrateLegacyStorageIfNeeded();
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export async function idbGetActiveProjectId(): Promise<string | undefined> {
  const meta = await idbGetMeta<IdbActiveMeta>("active");
  return meta?.lastProjectId;
}

export async function idbSetActiveProjectId(projectId: string): Promise<void> {
  await idbSetMeta("active", { lastProjectId: projectId } satisfies IdbActiveMeta);
}

export async function idbPutProject(record: IdbProjectRecord): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES.projects, "readwrite");
  tx.objectStore(STORES.projects).put(record);
  await txDone(tx);
}

export async function idbGetProject(projectId: string): Promise<IdbProjectRecord | undefined> {
  const db = await openDb();
  const tx = db.transaction(STORES.projects, "readonly");
  const record = await requestToPromise<IdbProjectRecord | undefined>(
    tx.objectStore(STORES.projects).get(projectId),
  );
  await txDone(tx);
  return record;
}

export async function idbPutAsset(projectId: string, path: string, blob: Blob): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES.assets, "readwrite");
  tx.objectStore(STORES.assets).put(blob, assetStoreKey(projectId, path));
  await txDone(tx);
}

export async function idbGetAsset(projectId: string, path: string): Promise<Blob | undefined> {
  const db = await openDb();
  const tx = db.transaction(STORES.assets, "readonly");
  const blob = await requestToPromise<Blob | undefined>(
    tx.objectStore(STORES.assets).get(assetStoreKey(projectId, path)),
  );
  await txDone(tx);
  return blob;
}

export async function idbRemoveAsset(projectId: string, path: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES.assets, "readwrite");
  tx.objectStore(STORES.assets).delete(assetStoreKey(projectId, path));
  await txDone(tx);
}

export async function idbPutOflCache(
  url: string,
  body: string,
  contentType: string,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES.ofl, "readwrite");
  tx.objectStore(STORES.ofl).put({
    url,
    body,
    contentType,
    cachedAt: Date.now(),
  } satisfies IdbOflEntry);
  await txDone(tx);
}

export async function idbGetOflCache(url: string): Promise<IdbOflEntry | undefined> {
  const db = await openDb();
  const tx = db.transaction(STORES.ofl, "readonly");
  const entry = await requestToPromise<IdbOflEntry | undefined>(
    tx.objectStore(STORES.ofl).get(url),
  );
  await txDone(tx);
  return entry;
}

function legacyCacheKey(path: string): string {
  return `${LEGACY_CACHE_ORIGIN}${normalizePath(path)}`;
}

function scopedLegacyCacheKey(projectId: string, path: string): string {
  return `${LEGACY_CACHE_ORIGIN}/projects/${encodeURIComponent(projectId)}${normalizePath(path)}`;
}

function pathFromLegacyCacheKey(key: string): string | undefined {
  const legacyPrefix = `${LEGACY_CACHE_ORIGIN}/assets/`;
  if (key.startsWith(legacyPrefix)) {
    return normalizePath(key.slice(LEGACY_CACHE_ORIGIN.length));
  }

  const projectsMarker = `${LEGACY_CACHE_ORIGIN}/projects/`;
  if (key.startsWith(projectsMarker)) {
    const rest = key.slice(projectsMarker.length);
    const slashIdx = rest.indexOf("/");
    if (slashIdx < 0) return undefined;
    return normalizePath(rest.slice(slashIdx));
  }

  if (key.startsWith("/assets/")) return normalizePath(key);
  const legacyScopedIdx = key.indexOf(":/assets/");
  if (legacyScopedIdx > 0) return normalizePath(key.slice(legacyScopedIdx + 1));

  return undefined;
}

async function migrateLegacyCacheAssets(projectId: string): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(LEGACY_CACHE_NAME);
    for (const request of await cache.keys()) {
      const key = typeof request === "string" ? request : request.url;
      const response = await cache.match(request);
      if (!response) continue;
      const blob = await response.blob();
      const path = pathFromLegacyCacheKey(key);
      if (path) {
        await idbPutAsset(projectId, path, blob);
      }
    }
  } catch (err) {
    console.warn("[project-idb] Legacy Cache API migration failed", err);
  }
}

async function migrateLegacyStorageIfNeeded(): Promise<void> {
  const migrated = await idbGetMeta<boolean>(MIGRATED_META_KEY);
  if (migrated) return;

  if (await idbHasAnyProject()) {
    await idbSetMeta(MIGRATED_META_KEY, true);
    return;
  }

  const raw = typeof localStorage !== "undefined" ? localStorage.getItem(LEGACY_SESSION_KEY) : null;
  if (!raw) {
    await idbSetMeta(MIGRATED_META_KEY, true);
    return;
  }

  let session: {
    snapshot: ProjectSnapshot;
    assets: PersistedAssetEntry[];
  };
  try {
    session = JSON.parse(raw) as {
      snapshot: ProjectSnapshot;
      assets: PersistedAssetEntry[];
    };
  } catch {
    await idbSetMeta(MIGRATED_META_KEY, true);
    return;
  }

  if (session.snapshot.version !== 2) {
    await idbSetMeta(MIGRATED_META_KEY, true);
    return;
  }

  const projectId = session.snapshot.id || randomId();
  await idbPutProject({
    id: projectId,
    name: session.snapshot.name,
    updatedAt: Date.now(),
    snapshot: session.snapshot,
    assets: session.assets,
  });
  await idbSetActiveProjectId(projectId);
  await migrateLegacyCacheAssets(projectId);

  for (const asset of session.assets) {
    if (await idbGetAsset(projectId, asset.path)) continue;
    try {
      const cache = await caches.open(LEGACY_CACHE_NAME);
      const scoped = await cache.match(scopedLegacyCacheKey(projectId, asset.path));
      const legacy = scoped ?? (await cache.match(legacyCacheKey(asset.path)));
      if (legacy) {
        await idbPutAsset(projectId, asset.path, await legacy.blob());
      }
    } catch {
      /* ignore per-asset migration failures */
    }
  }

  await idbSetMeta(MIGRATED_META_KEY, true);
}

/** Test-only reset of internal module state. */
export function resetProjectIdbForTests(): void {
  activeDb?.close();
  activeDb = null;
  dbPromise = null;
  initPromise = null;
}
