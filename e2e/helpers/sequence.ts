import { expect, type Page } from "@playwright/test";
import { sequenceCueRow } from "./cue-list-panel";

/** white-noise-short-{a,b}.wav duration from generate-audio-fixtures.mjs. */
export const SHORT_CLIP_DURATION_SEC = 0.5;

/**
 * Select each cue and wait until the inspector waveform has decoded duration.
 * Ensures sequence step timers use real clip length instead of the 5s default.
 */
export async function prefetchClipDurations(page: Page, cueNames: string[]): Promise<void> {
  const outPoint = page.getByRole("slider", { name: "Out point" });

  for (const name of cueNames) {
    await sequenceCueRow(page, name).click();
    await expect(outPoint).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => outPoint.getAttribute("aria-valuemax"), { timeout: 15_000 })
      .toBe(String(SHORT_CLIP_DURATION_SEC));
  }
}
