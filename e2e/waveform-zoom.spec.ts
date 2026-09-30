import { expect, test } from "@playwright/test";
import { expectCueInSequenceList, selectSequenceCueRow } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";

const AUDIO_FIXTURE = "white-noise-playback.wav";

test("inspector waveform zooms in, pans and fits back", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");

  await dropAudioOnCueList(page, fixturePath(AUDIO_FIXTURE), AUDIO_FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, AUDIO_FIXTURE);
  await selectSequenceCueRow(page, AUDIO_FIXTURE);

  const zoomIn = page.getByRole("button", { name: "Zoom in" });
  const zoomOut = page.getByRole("button", { name: "Zoom out" });
  const fit = page.getByRole("button", { name: "Fit whole file" });
  const pan = page.getByRole("slider", { name: "Scroll zoomed waveform" });
  const outHandle = page.getByRole("slider", { name: "Out point" });

  await expect(zoomIn).toBeEnabled();
  await expect(zoomOut).toBeDisabled();
  await expect(outHandle).toBeVisible();
  await expect(page.getByText("1.0×")).toBeVisible();

  await zoomIn.click();
  await zoomIn.click();
  await expect(page.getByText("4.0×")).toBeVisible();
  await expect(zoomOut).toBeEnabled();
  await expect(pan).toBeEnabled();

  // Zoomed around the middle: the end-of-file Out handle scrolls out of view.
  await expect(outHandle).toHaveCount(0);

  await pan.focus();
  await page.keyboard.press("End");
  await expect(outHandle).toBeVisible();

  await fit.click();
  await expect(page.getByText("1.0×")).toBeVisible();
  await expect(pan).toBeDisabled();
});
