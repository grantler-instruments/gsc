import type { Page } from "@playwright/test";
import { pressModShortcut } from "./app";

export async function waitPastHistoryCoalesce(page: Page): Promise<void> {
  await page.waitForTimeout(500);
}

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

export async function cutSelectedCues(page: Page): Promise<void> {
  await pressModShortcut(page, "x");
}

export async function pasteSelectedCues(page: Page): Promise<void> {
  await pressModShortcut(page, "v");
}

export async function duplicateSelectedCues(page: Page): Promise<void> {
  await pressModShortcut(page, "d");
}

export async function toggleShowMode(page: Page): Promise<void> {
  await pressModShortcut(page, "e");
}

export async function startNewProject(page: Page): Promise<void> {
  await pressModShortcut(page, "n");
}
