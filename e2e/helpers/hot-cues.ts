import { expect, type Page } from "@playwright/test";
import { copySelectedCues, deleteSelectedCue, pasteSelectedCues } from "./cue-editing";
import { containerCueRow } from "./cue-list-panel";

type HotPanelContainerType = "Sequence" | "Parallel";

export function hotCuePanel(page: Page) {
  return page.getByRole("complementary", { name: "Hot cues" });
}

/** Hot-cue pad container for a cue matched by display name. */
export function hotCuePad(page: Page, cueName: string) {
  return hotCuePanel(page)
    .getByText(cueName, { exact: true })
    .locator(
      "xpath=ancestor::*[count(.//button[normalize-space(.)='GO'])=1 and .//button[normalize-space(.)='GO']][1]",
    );
}

export async function hotCuePadSurfaceBackground(page: Page, cueName: string): Promise<string> {
  return hotCuePad(page, cueName).evaluate((el) => {
    for (const node of [el, ...Array.from(el.querySelectorAll("div"))]) {
      const bg = window.getComputedStyle(node).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        return bg;
      }
    }
    return "";
  });
}

export async function expectHotCuePadActive(page: Page, cueName: string): Promise<void> {
  const background = await hotCuePadSurfaceBackground(page, cueName);
  await expect(background).not.toBe("rgba(0, 0, 0, 0)");
  await expect(background).not.toBe("transparent");
}

/** Copy a main-list container cue into the hot cart, then remove it from the main list. */
export async function copyContainerToHotPanel(
  page: Page,
  containerType: HotPanelContainerType,
): Promise<void> {
  const sourceRow = containerCueRow(page, containerType);
  await expect(sourceRow).toHaveCount(1);

  await sourceRow.click();
  await copySelectedCues(page);

  const panel = hotCuePanel(page);
  await panel.click();
  await pasteSelectedCues(page);

  await expect(panel.getByRole("button", { name: "GO" })).toHaveCount(1, { timeout: 10_000 });

  await sourceRow.click();
  await deleteSelectedCue(page);
  await expect(containerCueRow(page, containerType)).toHaveCount(0);
}

export function hotCueListTabs(page: Page) {
  return hotCuePanel(page).getByRole("tablist", { name: "Cue lists" });
}

export async function addHotCueList(page: Page): Promise<void> {
  await hotCuePanel(page).getByRole("button", { name: "New hot cue list" }).click();
}

export async function selectHotCueListTab(page: Page, namePrefix: string): Promise<void> {
  const tab = hotCueListTabs(page).getByRole("tab", { name: new RegExp(`^${namePrefix}`) });
  await expect(tab).toHaveCount(1);
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

/** Top-level hot-cue pad display names in grid order (top to bottom, left to right). */
export async function hotCueNamesInOrder(page: Page): Promise<string[]> {
  return hotCuePanel(page).evaluate((panel) => {
    const grid = [...panel.querySelectorAll("div")].find(
      (el) =>
        window.getComputedStyle(el).display === "grid" &&
        el.querySelector('button:is([type="button"])'),
    );
    if (!grid) return [];

    return [...grid.children]
      .map((pad) => {
        const spans = [...pad.querySelectorAll("span")]
          .map((span) => span.textContent?.trim() ?? "")
          .filter((text) => text.length > 0 && text !== "GO" && !/^\d/.test(text));
        return spans.sort((a, b) => b.length - a.length)[0] ?? "";
      })
      .filter((name) => name.length > 0);
  });
}

/** Reorder hot-cue pads by dragging one pad after another (same list). */
export async function dragHotCuePadAfter(
  page: Page,
  sourceName: string,
  targetName: string,
): Promise<void> {
  await page.evaluate(
    ({ sourceName, targetName }) => {
      const hotPanel = document.querySelector('aside[aria-label="Hot cues"]');
      if (!hotPanel) throw new Error("Hot-cue panel not found");

      const findDraggablePad = (name: string): HTMLElement => {
        const label = [...hotPanel.querySelectorAll("*")].find(
          (el) => el.childElementCount === 0 && el.textContent?.trim() === name,
        );
        if (!label) throw new Error(`Hot cue pad "${name}" not found`);

        let cur: Element | null = label;
        while (cur && cur !== hotPanel) {
          if (cur instanceof HTMLElement && cur.draggable) return cur;
          cur = cur.parentElement;
        }
        throw new Error(`Draggable hot cue pad for "${name}" not found`);
      };

      const source = findDraggablePad(sourceName);
      const target = findDraggablePad(targetName);
      const rect = target.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.bottom - 2;

      const dt = new DataTransfer();
      const init = { bubbles: true, cancelable: true, dataTransfer: dt, clientX, clientY };
      source.dispatchEvent(new DragEvent("dragstart", init));
      target.dispatchEvent(new DragEvent("dragenter", init));
      target.dispatchEvent(new DragEvent("dragover", init));
      target.dispatchEvent(new DragEvent("drop", init));
      source.dispatchEvent(new DragEvent("dragend", init));
    },
    { sourceName, targetName },
  );
}
