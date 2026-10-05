import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  activeCueRow,
  activeCuesPanel,
  expectActiveCueStopped,
  expectPlaybackProgressToAdvance,
  openActiveCuesTab,
  pressTransportGo,
  transportGoButton,
} from "./helpers/active-cues";
import { gotoApp } from "./helpers/app";
import { expectCueInSequenceList, selectSequenceCueRow } from "./helpers/cue-list-panel";
import { setupAudioTargetCue } from "./helpers/cue-target-highlight";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";

const PLAYBACK_WAV = "white-noise-playback.wav";
const PLAYBACK_MP4 = "test-video-playback.mp4";

async function dragBy(page: Page, handle: Locator, deltaX: number): Promise<void> {
  const box = await handle.boundingBox();
  if (!box) throw new Error("handle not visible");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y, { steps: 6 });
  await page.mouse.up();
}

/** Set a fade knob from the keyboard: Home, then Shift+Arrow (1 s) and Arrow (0.1 s) steps. */
async function setFadeWithKeys(handle: Locator, seconds: number): Promise<void> {
  await handle.focus();
  await handle.press("Home");
  for (let i = 0; i < Math.floor(seconds); i++) await handle.press("Shift+ArrowRight");
  const tenths = Math.round((seconds % 1) * 10);
  for (let i = 0; i < tenths; i++) await handle.press("ArrowRight");
}

async function sliderValue(handle: Locator): Promise<number> {
  return Number(await handle.getAttribute("aria-valuenow"));
}

test.describe.configure({ mode: "serial" });

test("built-in fade out shows on the waveform and fades a stopped cue", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();

  await setupAudioTargetCue(page, fixturePath(PLAYBACK_WAV), PLAYBACK_WAV, "audio/wav");
  await selectSequenceCueRow(page, PLAYBACK_WAV);

  // Waveform knobs replace the fade inputs and the curve select.
  await expect(page.getByLabel("Fade in (s)")).toHaveCount(0);
  await expect(page.getByLabel("Fade out (s)")).toHaveCount(0);
  await expect(page.getByLabel("Curve")).toHaveCount(0);

  const fadeOutHandle = page.getByRole("slider", { name: "Fade out length" });
  await expect(fadeOutHandle).toHaveAttribute("aria-valuenow", "0");
  await setFadeWithKeys(fadeOutHandle, 2);
  await expect(fadeOutHandle).toHaveAttribute("aria-valuenow", "2");
  await expect(page.getByRole("tooltip", { name: "Fade out: 2 s" })).toBeVisible();
  // Right-click a knob to pick the curve.
  await fadeOutHandle.click({ button: "right" });
  const curveMenu = page.getByRole("menu", { name: "Curve" });
  await expect(curveMenu.getByRole("menuitemradio", { name: "Linear" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await curveMenu.getByRole("menuitemradio", { name: "Equal power" }).click();
  await expect(curveMenu).toBeHidden();
  // Right-click must not have moved the knob.
  await expect(fadeOutHandle).toHaveAttribute("aria-valuenow", "2");
  await page.getByRole("slider", { name: "Fade in length" }).click({ button: "right" });
  await expect(
    page.getByRole("menu", { name: "Curve" }).getByRole("menuitemradio", { name: "Equal power" }),
  ).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");

  await openActiveCuesTab(page);
  await pressTransportGo(page);
  await expectPlaybackProgressToAdvance(page, PLAYBACK_WAV);

  const row = activeCueRow(page, PLAYBACK_WAV);
  await row.getByRole("button", { name: "Stop" }).click();
  // The cue keeps playing while it fades out, then leaves the active list.
  await page.waitForTimeout(1_000);
  await expect(row).toBeVisible();
  await expectActiveCueStopped(page, PLAYBACK_WAV);
});

test("dragging the waveform fade handles sets fade in and fade out", async ({ page }) => {
  test.setTimeout(60_000);

  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();
  await setupAudioTargetCue(page, fixturePath(PLAYBACK_WAV), PLAYBACK_WAV, "audio/wav");
  await selectSequenceCueRow(page, PLAYBACK_WAV);

  const fadeInHandle = page.getByRole("slider", { name: "Fade in length" });
  const fadeOutHandle = page.getByRole("slider", { name: "Fade out length" });
  await expect(fadeInHandle).toHaveAttribute("aria-valuenow", "0");
  await expect(fadeOutHandle).toHaveAttribute("aria-valuenow", "0");
  const sliceSec = Number(await fadeInHandle.getAttribute("aria-valuemax"));

  // Hovering a knob shows its length.
  await fadeInHandle.hover();
  await expect(page.getByRole("tooltip", { name: "Fade in: 0 s" })).toBeVisible();

  await dragBy(page, fadeInHandle, 60);
  const fadeIn = await sliderValue(fadeInHandle);
  expect(fadeIn).toBeGreaterThan(0);
  await fadeInHandle.hover();
  await expect(page.getByRole("tooltip", { name: `Fade in: ${fadeIn} s` })).toBeVisible();

  await dragBy(page, fadeOutHandle, -60);
  const fadeOut = await sliderValue(fadeOutHandle);
  expect(fadeOut).toBeGreaterThan(0);

  // Dragging far past the other fade stops where the two meet.
  await dragBy(page, fadeInHandle, 2_000);
  expect((await sliderValue(fadeInHandle)) + fadeOut).toBeLessThanOrEqual(sliceSec + 0.01);

  // Dragging back to the In point snaps the fade off.
  await dragBy(page, fadeInHandle, -2_000);
  await expect(fadeInHandle).toHaveAttribute("aria-valuenow", "0");
});

test("video picture fades in after GO", async ({ page }) => {
  test.setTimeout(60_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoApp(page, { resetStorage: true });
  await expect(transportGoButton(page)).toBeVisible();
  await dropAudioOnCueList(page, fixturePath(PLAYBACK_MP4), PLAYBACK_MP4, "video/mp4");
  await expectCueInSequenceList(page, PLAYBACK_MP4);
  await selectSequenceCueRow(page, PLAYBACK_MP4);

  const fadeInHandle = page.getByRole("slider", { name: "Fade in length" });
  await setFadeWithKeys(fadeInHandle, 3);
  await expect(fadeInHandle).toHaveAttribute("aria-valuenow", "3");

  await openActiveCuesTab(page);
  await pressTransportGo(page);

  const preview = activeCuesPanel(page).locator("video").first();
  const opacity = () => preview.evaluate((el) => Number(getComputedStyle(el).opacity));
  await expect(preview).toBeAttached();
  await expect.poll(opacity, { timeout: 2_500, intervals: [50] }).toBeGreaterThan(0.05);
  expect(await opacity()).toBeLessThan(0.95);
  await expect.poll(opacity, { timeout: 5_000 }).toBeGreaterThan(0.99);
});
