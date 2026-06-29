import { expect, test } from "@playwright/test";
import { activeCueRow, pressPanic } from "./helpers/active-cues";
import {
  expectLoopIteration,
  expectLoopIterationAtLeast,
  prepareLoopCue,
  startSelectedLoopCue,
} from "./helpers/loop-playback";

test.describe.configure({ mode: "serial" });

const LOOP_MEDIA = [
  { fileName: "white-noise-playback.wav", mimeType: "audio/wav" },
  { fileName: "test-video-playback.mp4", mimeType: "video/mp4" },
] as const;

test("finite 2-loop playback completes for audio and video", async ({ page }) => {
  test.setTimeout(120_000);

  for (const { fileName, mimeType } of LOOP_MEDIA) {
    await prepareLoopCue(page, fileName, mimeType, { iterations: 2 });
    await startSelectedLoopCue(page, fileName);

    await expectLoopIteration(page, fileName, 2, 2);
    await expect(activeCueRow(page, fileName)).toBeHidden({ timeout: 20_000 });

    await pressPanic(page);
  }
});

test("infinite loop playback reaches 10 iterations for audio and video", async ({ page }) => {
  test.setTimeout(180_000);

  for (const { fileName, mimeType } of LOOP_MEDIA) {
    await prepareLoopCue(page, fileName, mimeType, { infinite: true });
    await startSelectedLoopCue(page, fileName);

    await expectLoopIterationAtLeast(page, fileName, 10);
    await pressPanic(page);
    await expect(activeCueRow(page, fileName)).toBeHidden({ timeout: 10_000 });
  }
});
