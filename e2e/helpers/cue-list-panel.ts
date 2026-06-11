import { expect, type Page } from "@playwright/test";

/** Main sequence cue list panel (excludes the hot-cue cart). */
export function sequenceCueListPanel(page: Page) {
  return page.locator("section").filter({
    has: page.locator('[data-gsc-drop-zone="cue-list"]'),
  });
}

export function sequenceCueListTabs(page: Page) {
  return sequenceCueListPanel(page).getByRole("tablist", { name: "Cue lists" });
}

export function sequenceCueList(page: Page) {
  return sequenceCueListPanel(page).locator('[data-gsc-drop-zone="cue-list"]');
}

/** Wait until a dropped/imported file appears as a cue row in the main list. */
export async function expectCueInSequenceList(page: Page, fileName: string): Promise<void> {
  const cue = sequenceCueList(page).locator("[data-cue-id]").filter({ hasText: fileName });
  await expect(cue).toHaveCount(1);
}
