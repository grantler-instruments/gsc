import { expect, type Page } from "@playwright/test";
import { sequenceCueListPanel } from "./cue-list-panel";

export type AddCueMenuType =
  | "Audio cue"
  | "Video cue"
  | "Image cue"
  | "Sequence"
  | "Parallel"
  | "Wait"
  | "Stop";

export async function openAddCueMenu(page: Page): Promise<void> {
  const panel = sequenceCueListPanel(page);
  await panel.locator("footer").getByRole("button", { name: "+ Cue ▾" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
}

export async function addCueType(page: Page, type: AddCueMenuType): Promise<void> {
  await openAddCueMenu(page);
  await page.getByRole("menuitem", { name: type, exact: true }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
}
