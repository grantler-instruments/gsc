import { expect, test } from "@playwright/test";
import { transportGoButton } from "./helpers/active-cues";
import {
  ASSET_DROP_CUE_LOAD_MAX_MS,
  measureCueListAssetDropLoadMs,
  WHITE_NOISE_FIXTURE,
  WHITE_NOISE_NAME,
} from "./helpers/drop-audio";

test("dropping an audio file onto the cue list creates a cue within the load budget", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");

  await expect(transportGoButton(page)).toBeVisible();

  const loadMs = await measureCueListAssetDropLoadMs(page, {
    fixturePath: WHITE_NOISE_FIXTURE,
    fileName: WHITE_NOISE_NAME,
    maxMs: ASSET_DROP_CUE_LOAD_MAX_MS,
  });

  test.info().annotations.push({
    type: "asset-drop-cue-load-ms",
    description: String(loadMs),
  });
});
