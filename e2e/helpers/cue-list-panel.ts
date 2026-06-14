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

/** Cue row in the main sequence list matched by exact display name. */
export function sequenceCueRow(page: Page, displayName: string) {
  return sequenceCueList(page).locator("[data-cue-id]", {
    has: page.getByText(displayName, { exact: true }),
  });
}

/** Wait until a dropped/imported file appears as a cue row in the main list. */
export async function expectCueInSequenceList(page: Page, fileName: string): Promise<void> {
  await expect(sequenceCueRow(page, fileName)).toHaveCount(1);
}

/** Sequence or parallel container row (identified by cue-type badge title). */
export function containerCueRow(page: Page, type: "Sequence" | "Parallel") {
  return sequenceCueList(page).locator("[data-cue-id]", {
    has: page.locator(`span[title="${type}"]`),
  });
}
