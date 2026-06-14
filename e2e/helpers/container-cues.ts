import { expect, type Locator, type Page } from "@playwright/test";
import { containerCueRow, sequenceCueList, sequenceCueRow } from "./cue-list-panel";

const GSC_CUE_DRAG_TYPE = "application/x-gsc-cue";

export type ContainerCueType = "Sequence" | "Parallel";
export type ContainerTarget = ContainerCueType | string;

function resolveCueRow(page: Page, displayName: string | RegExp): Locator {
  if (typeof displayName === "string") {
    return sequenceCueRow(page, displayName);
  }
  return sequenceCueList(page).locator("[data-cue-id]", {
    has: page.getByText(displayName),
  });
}

function resolveContainerRow(page: Page, target: ContainerTarget): Locator {
  if (target === "Sequence" || target === "Parallel") {
    return containerCueRow(page, target);
  }
  return sequenceCueRow(page, target);
}

/** Rename the currently selected cue via the inspector Name field. */
export async function renameSelectedCue(page: Page, newName: string): Promise<void> {
  const nameField = page.getByLabel("Name");
  await expect(nameField).toBeVisible();
  await nameField.fill(newName);
  await nameField.blur();
}

/** Drag a cue row into a sequence or parallel container (by type badge or display name). */
export async function dragCueIntoContainer(
  page: Page,
  sourceDisplayName: string | RegExp,
  containerTarget: ContainerTarget,
): Promise<void> {
  const sourceRow = resolveCueRow(page, sourceDisplayName);
  const containerRow = resolveContainerRow(page, containerTarget);

  await expect(sourceRow).toHaveCount(1);
  await expect(containerRow).toHaveCount(1);

  const sourceId = await sourceRow.getAttribute("data-cue-id");
  const containerId = await containerRow.getAttribute("data-cue-id");
  if (!sourceId || !containerId) {
    throw new Error(`Missing data-cue-id for drag (${sourceDisplayName} → ${containerTarget})`);
  }

  await page.evaluate(
    ({ sourceId, containerId, mimeType }) => {
      const source = document.querySelector(`[data-cue-id="${sourceId}"]`);
      const target = document.querySelector(`[data-cue-id="${containerId}"]`);
      if (!source || !target) {
        throw new Error("Drag source or target not found in DOM");
      }

      const rect = target.getBoundingClientRect();
      const clientY = rect.top + rect.height / 2;
      const clientX = rect.left + rect.width / 2;

      const dt = new DataTransfer();
      dt.setData(mimeType, JSON.stringify({ cueId: sourceId }));

      const dragInit = { bubbles: true, cancelable: true, dataTransfer: dt, clientY, clientX };
      source.dispatchEvent(new DragEvent("dragstart", dragInit));
      target.dispatchEvent(new DragEvent("dragover", dragInit));
      target.dispatchEvent(new DragEvent("drop", dragInit));
      source.dispatchEvent(new DragEvent("dragend", dragInit));
    },
    { sourceId, containerId, mimeType: GSC_CUE_DRAG_TYPE },
  );
}

/** Expand a collapsed sequence/parallel row so nested cues are visible. */
export async function expandContainerCue(
  page: Page,
  containerTarget: ContainerTarget,
): Promise<void> {
  const row = resolveContainerRow(page, containerTarget);
  const expandButton = row.getByRole("button", { expanded: false });
  if (await expandButton.count()) {
    await expandButton.click();
  }
}

/** Drag a cue to the leading zone below a container header (before its first child). */
export async function dragCueToContainerLeading(
  page: Page,
  sourceDisplayName: string | RegExp,
  containerTarget: ContainerTarget,
): Promise<void> {
  const sourceRow = resolveCueRow(page, sourceDisplayName);
  const containerRow = resolveContainerRow(page, containerTarget);

  await expect(sourceRow).toHaveCount(1);
  await expect(containerRow).toHaveCount(1);

  const sourceId = await sourceRow.getAttribute("data-cue-id");
  const containerId = await containerRow.getAttribute("data-cue-id");
  if (!sourceId || !containerId) {
    throw new Error(`Missing data-cue-id for leading drag into ${String(containerTarget)}`);
  }

  await expandContainerCue(page, containerTarget);

  const leadingZone = sequenceCueList(page).locator(
    `[data-gsc-drop-zone="cue-container-leading"][data-container-id="${containerId}"]`,
  );

  await page.evaluate(
    ({ sourceId, mimeType }) => {
      const source = document.querySelector(`[data-cue-id="${sourceId}"]`);
      if (!source) throw new Error("Drag source not found in DOM");

      const dt = new DataTransfer();
      dt.setData(mimeType, JSON.stringify({ cueId: sourceId }));
      source.dispatchEvent(
        new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: dt }),
      );
    },
    { sourceId, mimeType: GSC_CUE_DRAG_TYPE },
  );

  await expect(leadingZone).toHaveCount(1);

  await page.evaluate(
    ({ sourceId, containerId, mimeType }) => {
      const source = document.querySelector(`[data-cue-id="${sourceId}"]`);
      const target = document.querySelector(
        `[data-gsc-drop-zone="cue-container-leading"][data-container-id="${containerId}"]`,
      );
      if (!source || !target) {
        throw new Error("Drag source or container leading zone not found in DOM");
      }

      const rect = target.getBoundingClientRect();
      const clientY = rect.top + rect.height / 2;
      const clientX = rect.left + rect.width / 2;

      const dt = new DataTransfer();
      dt.setData(mimeType, JSON.stringify({ cueId: sourceId }));

      const dragInit = { bubbles: true, cancelable: true, dataTransfer: dt, clientY, clientX };
      target.dispatchEvent(new DragEvent("dragover", dragInit));
      target.dispatchEvent(new DragEvent("drop", dragInit));
      source.dispatchEvent(new DragEvent("dragend", dragInit));
    },
    { sourceId, containerId, mimeType: GSC_CUE_DRAG_TYPE },
  );
}

/** Drag a cue row before or after another cue row in the list. */
export async function dragCueRelativeToRow(
  page: Page,
  sourceDisplayName: string | RegExp,
  targetDisplayName: string | RegExp,
  place: "before" | "after",
  options?: { clientY?: number },
): Promise<void> {
  const sourceRow = resolveCueRow(page, sourceDisplayName);
  const targetRow = resolveCueRow(page, targetDisplayName);

  await expect(sourceRow).toHaveCount(1);
  await expect(targetRow).toHaveCount(1);

  const sourceId = await sourceRow.getAttribute("data-cue-id");
  const targetId = await targetRow.getAttribute("data-cue-id");
  if (!sourceId || !targetId) {
    throw new Error(
      `Missing data-cue-id for drag (${String(sourceDisplayName)} → ${String(targetDisplayName)})`,
    );
  }

  const targetBox = await targetRow.boundingBox();
  const clientYOverride =
    options?.clientY ??
    (targetBox
      ? place === "before"
        ? targetBox.y + 2
        : targetBox.y + targetBox.height - 2
      : undefined);

  await page.evaluate(
    ({ sourceId, targetId, place, mimeType, clientYOverride }) => {
      const source = document.querySelector(`[data-cue-id="${sourceId}"]`);
      const target = document.querySelector(`[data-cue-id="${targetId}"]`);
      if (!source || !target) {
        throw new Error("Drag source or target not found in DOM");
      }

      const rect = target.getBoundingClientRect();
      const clientY = clientYOverride ?? (place === "before" ? rect.top + 2 : rect.bottom - 2);
      const clientX = rect.left + rect.width / 2;

      const dt = new DataTransfer();
      dt.setData(mimeType, JSON.stringify({ cueId: sourceId }));

      const dragInit = { bubbles: true, cancelable: true, dataTransfer: dt, clientY, clientX };
      source.dispatchEvent(new DragEvent("dragstart", dragInit));
      target.dispatchEvent(new DragEvent("dragover", dragInit));
      target.dispatchEvent(new DragEvent("drop", dragInit));
      source.dispatchEvent(new DragEvent("dragend", dragInit));
    },
    { sourceId, targetId, place, mimeType: GSC_CUE_DRAG_TYPE, clientYOverride },
  );
}

/** Drag a cue to the exit zone below an expanded container (moves it to the parent level). */
export async function dragCueOutOfContainer(
  page: Page,
  sourceDisplayName: string | RegExp,
  containerTarget: ContainerTarget,
): Promise<void> {
  const sourceRow = resolveCueRow(page, sourceDisplayName);
  const containerRow = resolveContainerRow(page, containerTarget);

  await expect(sourceRow).toHaveCount(1);
  await expect(containerRow).toHaveCount(1);

  const sourceId = await sourceRow.getAttribute("data-cue-id");
  const containerId = await containerRow.getAttribute("data-cue-id");
  if (!sourceId || !containerId) {
    throw new Error(`Missing data-cue-id for drag out of ${String(containerTarget)}`);
  }

  await expandContainerCue(page, containerTarget);

  const exitZone = sequenceCueList(page).locator(
    `[data-gsc-drop-zone="cue-container-exit-trailing"][data-container-id="${containerId}"]`,
  );

  await page.evaluate(
    ({ sourceId, mimeType }) => {
      const source = document.querySelector(`[data-cue-id="${sourceId}"]`);
      if (!source) throw new Error("Drag source not found in DOM");

      const dt = new DataTransfer();
      dt.setData(mimeType, JSON.stringify({ cueId: sourceId }));
      source.dispatchEvent(
        new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: dt }),
      );
    },
    { sourceId, mimeType: GSC_CUE_DRAG_TYPE },
  );

  await expect(exitZone).toHaveCount(1);

  await page.evaluate(
    ({ sourceId, containerId, mimeType }) => {
      const source = document.querySelector(`[data-cue-id="${sourceId}"]`);
      const target = document.querySelector(
        `[data-gsc-drop-zone="cue-container-exit-trailing"][data-container-id="${containerId}"]`,
      );
      if (!source || !target) {
        throw new Error("Drag source or container exit zone not found in DOM");
      }

      const rect = target.getBoundingClientRect();
      const clientY = rect.top + rect.height / 2;
      const clientX = rect.left + rect.width / 2;

      const dt = new DataTransfer();
      dt.setData(mimeType, JSON.stringify({ cueId: sourceId }));

      const dragInit = { bubbles: true, cancelable: true, dataTransfer: dt, clientY, clientX };
      target.dispatchEvent(new DragEvent("dragover", dragInit));
      target.dispatchEvent(new DragEvent("drop", dragInit));
      source.dispatchEvent(new DragEvent("dragend", dragInit));
    },
    { sourceId, containerId, mimeType: GSC_CUE_DRAG_TYPE },
  );
}

/** Ungroup the selected container via the inspector. */
export async function ungroupContainer(
  page: Page,
  containerTarget: ContainerTarget,
): Promise<void> {
  await resolveContainerRow(page, containerTarget).click();
  await page.getByRole("button", { name: "Ungroup" }).click();
}

/** Visible cue row order for the given display-name labels (top to bottom). */
export async function cueRowOrderFor(page: Page, labels: string[]): Promise<string[]> {
  return sequenceCueList(page).evaluate((list, knownLabels) => {
    const rows = [...list.querySelectorAll("[data-cue-id]")];
    return rows
      .map((row) => knownLabels.find((label) => row.textContent?.includes(label)))
      .filter((label): label is string => !!label);
  }, labels);
}
