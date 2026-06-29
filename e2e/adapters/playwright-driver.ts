import { expect, type Page } from "@playwright/test";
import { waitForAppReady } from "../helpers/project-session";
import { APP_VIEWPORT } from "../shared/constants";
import type { AppDriver, WaitUntilOptions } from "../shared/driver";

const IDB_NAME = "gsc-v1";

async function clearProjectIdb(page: Page): Promise<void> {
  await page.evaluate(async (dbName) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
      request.onsuccess = () => resolve();
    });
  }, IDB_NAME);
}

export function createPlaywrightDriver(page: Page): AppDriver {
  return {
    async gotoApp(options) {
      await page.setViewportSize(APP_VIEWPORT);
      await page.goto("./");
      await waitForAppReady(page);

      if (options?.resetStorage) {
        await clearProjectIdb(page);
        await page.reload();
        await waitForAppReady(page);
      }
    },

    async clickByRole(role, name) {
      await page.getByRole(role as "button" | "tab" | "listitem", { name }).click();
    },

    async pressKey(key) {
      await page.keyboard.press(key);
    },

    async dispatchAudioDropOnCueList(filePath, fileName, mimeType) {
      const { dropAudioOnCueList } = await import("../helpers/drop-audio");
      await dropAudioOnCueList(page, filePath, fileName, mimeType);
    },

    async expectCueInSequenceList(fileName) {
      const { expectCueInSequenceList: expectCue } = await import("../shared/actions");
      await expectCue(this, fileName);
    },

    async waitForRole(role, name, options) {
      await expect(page.getByRole(role as "button" | "tab" | "listitem", { name })).toBeVisible({
        timeout: options?.timeout ?? 10_000,
      });
    },

    async evaluate(fn, arg) {
      return page.evaluate(fn, arg);
    },

    async waitUntil(predicate, options?: WaitUntilOptions) {
      await expect
        .poll(predicate, {
          timeout: options?.timeout ?? 10_000,
          intervals: options?.interval ? [options.interval] : undefined,
        })
        .toBe(true);
    },
  };
}
