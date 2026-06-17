import { type Download, expect, type Page } from "@playwright/test";
import { pressModShortcut } from "./app";

export function fileMenuButton(page: Page) {
  return page.getByRole("button", { name: /File menu/i });
}

export async function openFileMenu(page: Page): Promise<void> {
  await fileMenuButton(page).click();
}

/** Export the current project via the file menu and wait for the browser download. */
export async function exportProjectViaMenu(page: Page): Promise<Download> {
  const downloadPromise = page.waitForEvent("download");
  await openFileMenu(page);
  await page.getByRole("menuitem", { name: /^Export/ }).click();
  return downloadPromise;
}

/** Import a `.gsc.zip` bundle through Open → Open file…. */
export async function importProjectBundle(page: Page, bundlePath: string): Promise<void> {
  await pressModShortcut(page, "o");
  const dialog = page.getByRole("dialog", { name: /^Open/ });
  await expect(dialog).toBeVisible();

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /^Open file/ }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(bundlePath);

  await expect(dialog).toHaveCount(0, { timeout: 30_000 });
}
