import { expect, type Page } from "@playwright/test";

export async function openActiveCuesTab(page: Page): Promise<void> {
  await page.getByRole("tab", { name: "Active" }).click();
}

export function activeCuesPanel(page: Page) {
  return page.getByRole("tabpanel");
}

export function activeCueRow(page: Page, cueName: string) {
  return activeCuesPanel(page).getByRole("listitem").filter({ hasText: cueName });
}

/** Footer transport GO (not hot-cue pad GO). */
export function transportGoButton(page: Page) {
  return page.locator("footer").getByRole("button", { name: "GO" });
}

/** Fire the selected cue via the Space shortcut (same as the transport GO button). */
export async function pressTransportGo(page: Page): Promise<void> {
  await page.keyboard.press("Space");
}

/** Stop all playback via the Escape shortcut (same as the transport Panic button). */
export async function pressPanic(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
}

export function activeCuesEmptyMessage(page: Page) {
  return activeCuesPanel(page).getByText("No active cues. Press GO to run the selected cue.");
}

/** Wait until the active-cue progress bar advances. */
export async function expectPlaybackProgressToAdvance(page: Page, cueName: string): Promise<void> {
  const progress = activeCueRow(page, cueName).getByRole("progressbar");

  await expect(progress).toBeVisible();

  await expect
    .poll(async () => Number(await progress.getAttribute("aria-valuenow")), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0);

  const firstSample = Number(await progress.getAttribute("aria-valuenow"));

  await expect
    .poll(async () => Number(await progress.getAttribute("aria-valuenow")), {
      timeout: 15_000,
    })
    .toBeGreaterThan(firstSample);
}
