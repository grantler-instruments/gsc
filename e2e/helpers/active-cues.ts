import { expect, type Page } from "@playwright/test";

export async function openActiveCuesTab(page: Page): Promise<void> {
  await page.getByRole("tab", { name: "Active" }).click();
}

export function activeCuesPanel(page: Page) {
  const aside = page.locator("aside").first();
  return aside.getByRole("tabpanel").or(aside.getByRole("region", { name: "Active cues" }));
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

export function activeCueWaveformSeek(page: Page, cueName: string) {
  return activeCueRow(page, cueName).getByRole("slider", { name: "Seek playback position" });
}

export async function getWaveformPositionSec(page: Page, cueName: string): Promise<number> {
  const value = await activeCueWaveformSeek(page, cueName).getAttribute("aria-valuenow");
  return Number(value ?? 0);
}

/** Click the active-cue waveform at a horizontal ratio (0 = start, 1 = end). */
export async function seekWaveformAtRatio(
  page: Page,
  cueName: string,
  ratio: number,
): Promise<void> {
  const waveform = activeCueWaveformSeek(page, cueName);
  const box = await waveform.boundingBox();
  if (!box) {
    throw new Error(`Waveform seek slider not visible for cue "${cueName}"`);
  }

  const clamped = Math.max(0.05, Math.min(0.95, ratio));
  await waveform.click({
    position: { x: box.width * clamped, y: box.height / 2 },
    force: true,
  });
}

export async function expectActiveCueStopped(page: Page, cueName: string): Promise<void> {
  await expect(activeCueRow(page, cueName)).toBeHidden({ timeout: 10_000 });
  await expect(activeCuesEmptyMessage(page)).toBeVisible();
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
