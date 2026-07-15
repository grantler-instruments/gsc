import { expect, type Page } from "@playwright/test";
import { transportGoButton } from "./active-cues";

const IDB_NAME = "gsc-v1";

export function showNameButton(page: Page) {
  return page.getByRole("button", { name: "Edit show details" });
}

export async function waitForAppReady(page: Page): Promise<void> {
  await expect(transportGoButton(page)).toBeVisible({ timeout: 30_000 });
}

export async function renameShow(page: Page, name: string): Promise<void> {
  await showNameButton(page).click();
  const dialog = page.getByRole("dialog", { name: "Show details" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Name" }).fill(name);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(showNameButton(page)).toHaveText(name);
}

async function readAutosavedProjectName(page: Page): Promise<string | null> {
  return page.evaluate(async (dbName) => {
    const openDb = () =>
      new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });

    const readStore = <T>(db: IDBDatabase, storeName: string, key: IDBValidKey) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as T | undefined);
      });

    const db = await openDb();
    try {
      const meta = await readStore<{ lastProjectId?: string }>(db, "meta", "active");
      if (!meta?.lastProjectId) return null;

      const project = await readStore<{ name?: string }>(db, "projects", meta.lastProjectId);
      return project?.name ?? null;
    } finally {
      db.close();
    }
  }, IDB_NAME);
}

/** Wait until the debounced browser autosave has written the show name to IndexedDB. */
export async function waitForAutosavedShowName(page: Page, showName: string): Promise<void> {
  await expect.poll(async () => readAutosavedProjectName(page), { timeout: 15_000 }).toBe(showName);
}

async function autosavedSnapshotContainsCue(page: Page, cueName: string): Promise<boolean> {
  return page.evaluate(
    async ({ dbName, expectedCueName }) => {
      const openDb = () =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(dbName);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });

      const readStore = <T>(db: IDBDatabase, storeName: string, key: IDBValidKey) =>
        new Promise<T | undefined>((resolve, reject) => {
          const tx = db.transaction(storeName, "readonly");
          const request = tx.objectStore(storeName).get(key);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result as T | undefined);
        });

      const db = await openDb();
      try {
        const meta = await readStore<{ lastProjectId?: string }>(db, "meta", "active");
        if (!meta?.lastProjectId) return false;

        const project = await readStore<{
          snapshot?: { cueLists?: Array<{ cues?: Array<{ name?: string }> }> };
        }>(db, "projects", meta.lastProjectId);
        const cueLists = project?.snapshot?.cueLists ?? [];
        return cueLists.some((list) => list.cues?.some((cue) => cue.name === expectedCueName));
      } finally {
        db.close();
      }
    },
    { dbName: IDB_NAME, expectedCueName: cueName },
  );
}

/** Wait until the autosaved project snapshot includes a cue with the given name. */
export async function waitForAutosavedCue(page: Page, cueName: string): Promise<void> {
  await expect
    .poll(async () => autosavedSnapshotContainsCue(page, cueName), { timeout: 15_000 })
    .toBe(true);
}
