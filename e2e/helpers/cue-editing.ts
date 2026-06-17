import type { Page } from "@playwright/test";
import { pressModShortcut } from "./app";

export async function deleteSelectedCue(page: Page): Promise<void> {
  await page.keyboard.press("Backspace");
}

export async function undoProjectEdit(page: Page): Promise<void> {
  await pressModShortcut(page, "z");
}

export async function redoProjectEdit(page: Page): Promise<void> {
  await pressModShortcut(page, "Shift+z");
}

export async function copySelectedCues(page: Page): Promise<void> {
  await pressModShortcut(page, "c");
}

export async function pasteSelectedCues(page: Page): Promise<void> {
  await pressModShortcut(page, "v");
}
