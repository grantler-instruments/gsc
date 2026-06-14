import { expect, type Page } from "@playwright/test";
import { waitForAppReady } from "./project-session";

const IDB_NAME = "gsc-v1";

export const APP_VIEWPORT = { width: 1440, height: 900 } as const;

/** Clear autosaved project data (call after the app origin is loaded). */
export async function clearProjectIdb(page: Page): Promise<void> {
  await page.evaluate(async (dbName) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
      request.onsuccess = () => resolve();
    });
  }, IDB_NAME);
}

export async function gotoApp(page: Page, options?: { resetStorage?: boolean }): Promise<void> {
  await page.setViewportSize(APP_VIEWPORT);
  await page.goto("./");
  await waitForAppReady(page);

  if (options?.resetStorage) {
    await clearProjectIdb(page);
    await page.reload();
    await waitForAppReady(page);
  }
}

/** Modifier key for shortcuts: Meta on macOS, Control in Linux CI. */
export function modKey(): "Meta" | "Control" {
  return process.platform === "darwin" ? "Meta" : "Control";
}

export async function pressModShortcut(page: Page, key: string): Promise<void> {
  await page.keyboard.press(`${modKey()}+${key}`);
}

export async function expectNoActiveCues(page: Page): Promise<void> {
  await expect(page.getByText("No active cues. Press GO to run the selected cue.")).toBeVisible();
}
