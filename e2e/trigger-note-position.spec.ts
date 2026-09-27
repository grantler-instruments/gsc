import { expect, test } from "@playwright/test";
import { addCueType } from "./helpers/add-cue";

test("trigger notes can be dragged, stay in the window, and remember their position", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./");
  await addCueType(page, "Audio cue");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Trigger note", exact: true })
    .fill("Stand by for the next scene");
  const handle = page.getByRole("button", {
    name: "Move trigger note (drag or use arrow keys)",
    exact: true,
  });
  const card = page.locator('[aria-live="polite"]').filter({ has: handle });
  await expect(card).toBeVisible();
  const start = await handle.boundingBox();
  if (!start) throw new Error("Missing drag handle");
  await page.mouse.move(start.x + 10, start.y + 10);
  await page.mouse.down();
  await page.mouse.move(start.x - 400, start.y + 210, { steps: 10 });
  await page.mouse.up();
  const moved = await card.boundingBox();
  if (!moved) throw new Error("Missing note card");
  expect(moved.x).toBeLessThan(800);
  expect(moved.y).toBeGreaterThan(150);
  await handle.focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => (await card.boundingBox())?.x).toBe(moved.x - 10);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("gsc-ui") ?? "{}").state.triggerNotePosition,
  );
  expect(saved.x).toBe(moved.x - 10);
  expect(saved.y).toBe(moved.y);
  await page.setViewportSize({ width: 800, height: 600 });
  await expect
    .poll(async () => {
      const box = await card.boundingBox();
      return box
        ? box.x >= 16 && box.y >= 16 && box.x + box.width <= 784 && box.y + box.height <= 584
        : false;
    })
    .toBe(true);
  await card.getByRole("button", { name: "Close", exact: true }).click();
  await expect(card).toHaveCount(0);
});
