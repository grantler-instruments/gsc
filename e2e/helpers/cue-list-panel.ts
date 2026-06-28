import { expect, type Page } from "@playwright/test";

/** Main sequence cue list panel (excludes the hot-cue cart). */
export function sequenceCueListPanel(page: Page) {
  return page.locator("section").filter({
    has: page.locator('[data-gsc-drop-zone="cue-list"]'),
  });
}

export function sequenceCueListTabs(page: Page) {
  return sequenceCueListPanel(page).getByRole("tablist", { name: "Cue lists" });
}

const GSC_CUE_LIST_TAB_DRAG_TYPE = "application/x-gsc-cue-list-tab";

/** Visible cue-list tab order matched against the provided name prefixes (left to right). */
export async function cueListTabOrder(page: Page, namePrefixes: string[]): Promise<string[]> {
  return sequenceCueListTabs(page).evaluate((tablist, prefixes) => {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    return tabs
      .map((tab) => prefixes.find((p) => tab.textContent?.trim().startsWith(p)))
      .filter((p): p is string => !!p);
  }, namePrefixes);
}

/** Drag a cue-list tab before/after another tab. Tabs are matched by name prefix. */
export async function dragCueListTab(
  page: Page,
  sourcePrefix: string,
  targetPrefix: string,
  place: "before" | "after",
): Promise<void> {
  const tablist = sequenceCueListTabs(page);
  const source = tablist.getByRole("tab", { name: new RegExp(`^${sourcePrefix}`) });
  const target = tablist.getByRole("tab", { name: new RegExp(`^${targetPrefix}`) });
  await expect(source).toHaveCount(1);
  await expect(target).toHaveCount(1);

  await page.evaluate(
    ({ sourcePrefix, targetPrefix, place, mimeType }) => {
      const tabs = [
        ...document.querySelectorAll('[role="tablist"][aria-label="Cue lists"] [role="tab"]'),
      ];
      const findTab = (prefix: string) =>
        tabs.find((tab) => tab.textContent?.trim().startsWith(prefix));
      const sourceEl = findTab(sourcePrefix);
      const targetEl = findTab(targetPrefix);
      if (!sourceEl || !targetEl) throw new Error("Tab drag source or target not found in DOM");

      const listId = sourceEl.getAttribute("data-cue-list-id");
      if (!listId) throw new Error("Tab drag source missing data-cue-list-id");

      const rect = targetEl.getBoundingClientRect();
      const clientX = place === "before" ? rect.left + 2 : rect.right - 2;
      const clientY = rect.top + rect.height / 2;

      const dt = new DataTransfer();
      dt.setData(mimeType, JSON.stringify({ listId }));

      const init = { bubbles: true, cancelable: true, dataTransfer: dt, clientX, clientY };
      sourceEl.dispatchEvent(new DragEvent("dragstart", init));
      targetEl.dispatchEvent(new DragEvent("dragover", init));
      targetEl.dispatchEvent(new DragEvent("drop", init));
      sourceEl.dispatchEvent(new DragEvent("dragend", init));
    },
    { sourcePrefix, targetPrefix, place, mimeType: GSC_CUE_LIST_TAB_DRAG_TYPE },
  );
}

export function sequenceCueList(page: Page) {
  return sequenceCueListPanel(page).locator('[data-gsc-drop-zone="cue-list"]');
}

/** Cue row in the main sequence list matched by exact display name. */
export function sequenceCueRow(page: Page, displayName: string) {
  return sequenceCueList(page).locator("[data-cue-id]", {
    has: page.getByText(displayName, { exact: true }),
  });
}

/** Wait until a dropped/imported file appears as a cue row in the main list. */
export async function expectCueInSequenceList(page: Page, fileName: string): Promise<void> {
  await expect(sequenceCueRow(page, fileName)).toHaveCount(1);
}

/** Sequence or parallel container row (identified by cue-type badge title). */
export function containerCueRow(page: Page, type: "Sequence" | "Parallel") {
  return sequenceCueList(page).locator("[data-cue-id]", {
    has: page.locator(`span[title="${type}"]`),
  });
}
