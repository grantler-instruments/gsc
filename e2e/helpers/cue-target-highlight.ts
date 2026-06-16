import { expect, type Locator, type Page } from "@playwright/test";
import { sequenceCueRow } from "./cue-list-panel";
import { dropAudioOnCueList } from "./drop-audio";
import { createPanFadeForCue, createVolumeFadeForCue, fadeCueDisplayName } from "./fade-cues";

export const TARGET_ROW_FLASH_ANIMATION = "cueTargetRowFlash";

export async function readCueNumber(row: Locator): Promise<string> {
  const number = await row.locator("[data-cue-number]").textContent();
  if (!number?.trim()) throw new Error("Cue row missing number");
  return number.trim();
}

export function stopCueDisplayName(targetNumber: string, targetName: string): string {
  return `Stop ${targetNumber} ${targetName}`;
}

export async function createStopForCue(page: Page, targetName: string): Promise<void> {
  const row = sequenceCueRow(page, targetName);
  await row.click();
  await row.getByRole("button", { name: `Create stop cue for ${targetName}` }).click();
}

async function rowAnimationName(row: Locator): Promise<string> {
  return row.evaluate((el) => window.getComputedStyle(el).animationName);
}

async function rowHasTargetBorder(row: Locator): Promise<boolean> {
  return row.evaluate((el) => {
    const shadow = window.getComputedStyle(el).boxShadow;
    return shadow.includes("inset 3px 0 0");
  });
}

export async function expectCueRowTargetHighlighted(row: Locator): Promise<void> {
  await expect
    .poll(
      async () => {
        const animation = await rowAnimationName(row);
        if (animation.includes(TARGET_ROW_FLASH_ANIMATION)) return true;
        return rowHasTargetBorder(row);
      },
      { timeout: 3_000 },
    )
    .toBe(true);
}

export async function expectCueRowTargetNotHighlighted(row: Locator): Promise<void> {
  await expect
    .poll(
      async () => {
        const animation = await rowAnimationName(row);
        if (animation.includes(TARGET_ROW_FLASH_ANIMATION)) return false;
        return rowHasTargetBorder(row);
      },
      { timeout: 3_000 },
    )
    .toBe(false);
}

/** Deselect utility cues and move the pointer away from the cue list. */
export async function clearCueTargetHighlightState(page: Page, targetName: string): Promise<void> {
  await sequenceCueRow(page, targetName).click();
  await page.getByRole("button", { name: "GO" }).hover();
}

export async function expectTargetHighlightsOnHoverAndSelect(
  page: Page,
  targetName: string,
  utilityRow: Locator,
): Promise<void> {
  const targetRow = sequenceCueRow(page, targetName);

  await clearCueTargetHighlightState(page, targetName);
  await expectCueRowTargetNotHighlighted(targetRow);

  await utilityRow.hover();
  await expectCueRowTargetHighlighted(targetRow);

  // Border persists after the one-shot flash finishes.
  await targetRow.page().waitForTimeout(2_100);
  await expectCueRowTargetHighlighted(targetRow);

  await clearCueTargetHighlightState(page, targetName);
  await expectCueRowTargetNotHighlighted(targetRow);

  await utilityRow.click();
  await expectCueRowTargetHighlighted(targetRow);
}

export async function setupAudioTargetCue(
  page: Page,
  fixturePathArg: string,
  fileName: string,
  mimeType: string,
): Promise<void> {
  await dropAudioOnCueList(page, fixturePathArg, fileName, mimeType);
  await expect(sequenceCueRow(page, fileName)).toHaveCount(1);
}

export async function stopCueRowForTarget(page: Page, targetName: string): Promise<Locator> {
  const targetNumber = await readCueNumber(sequenceCueRow(page, targetName));
  const stopName = stopCueDisplayName(targetNumber, targetName);
  const stopRow = sequenceCueRow(page, stopName);
  await expect(stopRow).toHaveCount(1);
  return stopRow;
}

export async function volumeFadeCueRowForTarget(page: Page, targetName: string): Promise<Locator> {
  await createVolumeFadeForCue(page, targetName);
  const fadeName = fadeCueDisplayName("Volume fade", targetName);
  const fadeRow = sequenceCueRow(page, fadeName);
  await expect(fadeRow).toHaveCount(1);
  return fadeRow;
}

export async function panFadeCueRowForTarget(page: Page, targetName: string): Promise<Locator> {
  await createPanFadeForCue(page, targetName);
  const fadeName = fadeCueDisplayName("Pan fade", targetName);
  const fadeRow = sequenceCueRow(page, fadeName);
  await expect(fadeRow).toHaveCount(1);
  return fadeRow;
}
