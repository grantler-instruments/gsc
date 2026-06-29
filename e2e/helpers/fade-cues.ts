import { expect, type Page } from "@playwright/test";
import { activeCueRow } from "./active-cues";
import { sequenceCueRow } from "./cue-list-panel";

export function fadeCueDisplayName(
  fadeLabel: "Volume fade" | "Pan fade",
  targetName: string,
): string {
  return `${fadeLabel} ${targetName}`;
}

export async function createVolumeFadeForCue(page: Page, targetName: string): Promise<void> {
  const row = sequenceCueRow(page, targetName);
  await row.click();
  await row.getByRole("button", { name: `Create volume fade for ${targetName}` }).click();
}

export async function createPanFadeForCue(page: Page, targetName: string): Promise<void> {
  const row = sequenceCueRow(page, targetName);
  await row.click();
  await row.getByRole("button", { name: `Create pan fade for ${targetName}` }).click();
}

export async function setInspectorPan(page: Page, pan: number): Promise<void> {
  const panSlider = page.getByRole("slider", { name: /^Pan / });
  await expect(panSlider).toBeVisible();
  await panSlider.fill(String(pan));
  await expect(panSlider).toHaveValue(String(pan));
}

export async function enableLoopPlayback(page: Page): Promise<void> {
  const loopCheckbox = page.getByRole("checkbox", { name: "Loop playback" });
  await expect(loopCheckbox).toBeVisible();
  await loopCheckbox.check();
}

function activeCueLevelSlider(page: Page, cueName: string, levelLabel: "Vol" | "Pan") {
  return activeCueRow(page, cueName).getByRole("slider", {
    name: new RegExp(`^${levelLabel} `),
  });
}

export async function setFadeDuration(page: Page, seconds: number): Promise<void> {
  const duration = page.getByRole("spinbutton", { name: "Duration (seconds)" });
  await expect(duration).toBeVisible();
  await duration.fill(String(seconds));
  await duration.blur();
  await expect(duration).toHaveValue(String(seconds));
}

/** Wait until an active-cue Vol/Pan slider moves down from its starting value. */
export async function expectActiveCueLevelToDecrease(
  page: Page,
  cueName: string,
  levelLabel: "Vol" | "Pan",
  minStart = 0.2,
): Promise<void> {
  const slider = activeCueLevelSlider(page, cueName, levelLabel);
  await expect(slider).toBeVisible();

  await expect
    .poll(async () => Number(await slider.inputValue()), { timeout: 5_000 })
    .toBeGreaterThanOrEqual(minStart);

  const start = Number(await slider.inputValue());

  await expect
    .poll(async () => Number(await slider.inputValue()), { timeout: 5_000 })
    .toBeLessThan(start - 0.05);
}
