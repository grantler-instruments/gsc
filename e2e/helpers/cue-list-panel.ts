import type { Page } from "@playwright/test";

/** Main sequence cue list panel (excludes the hot-cue cart). */
export function sequenceCueListPanel(page: Page) {
  return page.locator("section").filter({
    has: page.locator('[data-gsc-drop-zone="cue-list"]'),
  });
}

export function sequenceCueListTabs(page: Page) {
  return sequenceCueListPanel(page).getByRole("tablist", { name: "Cue lists" });
}
