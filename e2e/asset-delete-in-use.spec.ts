import { expect, type Locator, type Page, test } from "@playwright/test";
import { transportGoButton } from "./helpers/active-cues";
import { gotoApp } from "./helpers/app";
import { sequenceCueRow } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";

const PLAYBACK_WAV = "white-noise-playback.wav";

function assetRow(page: Page): Locator {
  return page.locator('[data-gsc-drop-zone="assets"] [data-asset-path]', {
    has: page.getByText(PLAYBACK_WAV, { exact: true }),
  });
}

async function importAssetAndCue(page: Page): Promise<void> {
  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(PLAYBACK_WAV), PLAYBACK_WAV, "audio/wav");
  await expect(sequenceCueRow(page, PLAYBACK_WAV)).toHaveCount(1);
  await expect(assetRow(page)).toHaveCount(1);
}

test("keeps the asset and its cues when dismissing the in-use dialog", async ({ page }) => {
  test.setTimeout(60_000);
  await importAssetAndCue(page);

  await assetRow(page).locator('button[title="Remove"]').click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Asset in use" })).toBeVisible();
  // The cue that uses the asset is listed inside the dialog.
  await expect(dialog.getByText(PLAYBACK_WAV, { exact: true })).toHaveCount(1);

  await dialog.getByRole("button", { name: "OK" }).click();
  await expect(dialog).toBeHidden();

  await expect(assetRow(page)).toHaveCount(1);
  await expect(sequenceCueRow(page, PLAYBACK_WAV)).toHaveCount(1);
});

test("requires a second confirmation and can be cancelled there", async ({ page }) => {
  test.setTimeout(60_000);
  await importAssetAndCue(page);

  await assetRow(page).locator('button[title="Remove"]').click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Delete cues using this asset" }).click();

  // Second confirmation step.
  await expect(
    dialog.getByRole("heading", { name: "Delete cues using this asset?" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  // Cancelling at the confirmation leaves everything intact.
  await expect(assetRow(page)).toHaveCount(1);
  await expect(sequenceCueRow(page, PLAYBACK_WAV)).toHaveCount(1);
});

test("deletes the asset and its cues after confirming", async ({ page }) => {
  test.setTimeout(60_000);
  await importAssetAndCue(page);

  await assetRow(page).locator('button[title="Remove"]').click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Delete cues using this asset" }).click();
  await dialog.getByRole("button", { name: "Delete cues", exact: true }).click();
  await expect(dialog).toBeHidden();

  await expect(assetRow(page)).toHaveCount(0);
  await expect(sequenceCueRow(page, PLAYBACK_WAV)).toHaveCount(0);
});
