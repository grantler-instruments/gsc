import { expect, test } from "@playwright/test";
import { transportGoButton } from "./helpers/active-cues";

test("dropping an external file outside a drop zone is prevented from navigating", async ({
  page,
}) => {
  await page.goto("./");
  await expect(transportGoButton(page)).toBeVisible();

  const result = await page.evaluate(() => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(["test"], "outside-drop-zone.wav", { type: "audio/wav" }));
    const init = { bubbles: true, cancelable: true, dataTransfer };

    const dragover = new DragEvent("dragover", init);
    const drop = new DragEvent("drop", init);
    document.body.dispatchEvent(dragover);
    document.body.dispatchEvent(drop);

    return {
      dragoverPrevented: dragover.defaultPrevented,
      dropPrevented: drop.defaultPrevented,
      url: window.location.href,
    };
  });

  expect(result.dragoverPrevented).toBe(true);
  expect(result.dropPrevented).toBe(true);
  expect(result.url).toBe(page.url());
});
