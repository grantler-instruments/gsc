import { expect, test } from "@playwright/test";
import { transportGoButton } from "./helpers/active-cues";
import { addCueType } from "./helpers/add-cue";

test("trigger notes stay above the transport when resized and can be dismissed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./");
  await addCueType(page, "Audio");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Trigger note", exact: true })
    .fill("Stand by for the next scene");
  const card = page
    .locator('[aria-live="polite"]')
    .filter({ hasText: "Stand by for the next scene" });
  await expect(card).toBeVisible();
  await expect(card.getByText("Audio cue", { exact: true })).toBeVisible();
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 800, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () => {
        const box = await card.boundingBox();
        const go = await transportGoButton(page).boundingBox();
        return Boolean(
          box &&
            go &&
            box.x >= 0 &&
            box.y >= 0 &&
            box.x + box.width <= viewport.width &&
            box.y + box.height <= go.y &&
            go.y + go.height <= viewport.height,
        );
      })
      .toBe(true);
  }
  await card.getByRole("button", { name: "Close", exact: true }).click();
  await expect(card).toHaveCount(0);
});
