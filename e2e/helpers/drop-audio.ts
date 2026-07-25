import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { ASSET_DROP_CUE_LOAD_MAX_MS } from "../shared/asset-drop";
import {
  fixturePath,
  mimeTypeForFileName,
  WHITE_NOISE_ALT_FIXTURE,
  WHITE_NOISE_ALT_NAME,
  WHITE_NOISE_FIXTURE,
  WHITE_NOISE_NAME,
} from "../shared/fixtures";
import { sequenceCueList, sequenceCueRow } from "./cue-list-panel";

export {
  ASSET_DROP_CUE_LOAD_MAX_MS,
  fixturePath,
  mimeTypeForFileName,
  WHITE_NOISE_ALT_FIXTURE,
  WHITE_NOISE_ALT_NAME,
  WHITE_NOISE_FIXTURE,
  WHITE_NOISE_NAME,
};

export type AudioDropTarget = "cue-list" | "hot-cue-panel";

async function createAudioDataTransfer(
  page: Page,
  bytes: Buffer,
  fileName: string,
  mimeType: string,
) {
  return page.evaluateHandle(
    (data) => {
      const binary = atob(data.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], data.name, { type: data.mimeType }));
      return dt;
    },
    { base64: bytes.toString("base64"), name: fileName, mimeType },
  );
}

/** Simulate dropping an audio file onto a cue-list or hot-cue drop zone. */
export async function dropAudioFile(
  page: Page,
  options: {
    fixturePath: string;
    fileName: string;
    mimeType?: string;
    target: AudioDropTarget;
  },
): Promise<void> {
  const bytes = readFileSync(options.fixturePath);
  const mimeType = options.mimeType ?? mimeTypeForFileName(options.fileName);
  const dataTransfer = await createAudioDataTransfer(page, bytes, options.fileName, mimeType);

  if (options.target === "cue-list") {
    const dropZone = sequenceCueList(page);
    await expect(dropZone).toHaveCount(1);
    await dropZone.dispatchEvent("dragover", { dataTransfer });
    await dropZone.dispatchEvent("drop", { dataTransfer });
    return;
  }

  const hotPanel = page.getByRole("complementary", { name: "Hot cues" });
  const emptyDropZone = hotPanel.getByText(
    "Drop assets here or use the flame button to add hot cues.",
  );
  const dropZone =
    (await emptyDropZone.count()) > 0
      ? emptyDropZone
      : hotPanel
          .locator("div")
          .filter({
            has: page.locator('button:has-text("GO")'),
          })
          .first();

  await dropZone.dispatchEvent("dragover", { dataTransfer });
  await dropZone.dispatchEvent("drop", { dataTransfer });
}

/** Append a hot cue by dropping onto the hot-cue grid (when pads already exist). */
export async function appendAudioOnHotCuePanel(
  page: Page,
  fixturePathArg: string,
  fileName: string,
  mimeType?: string,
): Promise<void> {
  const bytes = readFileSync(fixturePathArg);
  const resolvedMimeType = mimeType ?? mimeTypeForFileName(fileName);
  const dataTransfer = await createAudioDataTransfer(page, bytes, fileName, resolvedMimeType);

  const hotPanel = page.getByRole("complementary", { name: "Hot cues" });
  await hotPanel.evaluate((panel, dt) => {
    const grid = [...panel.querySelectorAll("div")].find((el) => {
      if (!el.querySelector("button")) return false;
      return window.getComputedStyle(el).display === "grid";
    });
    if (!grid) throw new Error("Hot cue grid not found");
    const init = { bubbles: true, cancelable: true, dataTransfer: dt as DataTransfer };
    grid.dispatchEvent(new DragEvent("dragover", init));
    grid.dispatchEvent(new DragEvent("drop", init));
  }, dataTransfer);
}

/** Drop audio onto a specific hot-cue pad matched by its current display name. */
export async function dropAudioOnHotCuePad(
  page: Page,
  targetCueName: string,
  fixturePathArg: string,
  fileName: string,
  mimeType?: string,
): Promise<void> {
  const bytes = readFileSync(fixturePathArg);
  const resolvedMimeType = mimeType ?? mimeTypeForFileName(fileName);
  const dataTransfer = await createAudioDataTransfer(page, bytes, fileName, resolvedMimeType);

  const hotPanel = page.getByRole("complementary", { name: "Hot cues" });
  const pad = hotPanel
    .getByText(targetCueName, { exact: true })
    .locator(
      "xpath=ancestor::*[count(.//button[normalize-space(.)='GO'])=1 and .//button[normalize-space(.)='GO']][1]",
    );

  await pad.dispatchEvent("dragover", { dataTransfer });
  await pad.dispatchEvent("drop", { dataTransfer });
}

export async function dropAudioOnCueList(
  page: Page,
  fixturePathArg = WHITE_NOISE_FIXTURE,
  fileName = WHITE_NOISE_NAME,
  mimeType?: string,
): Promise<void> {
  await dropAudioFile(page, {
    fixturePath: fixturePathArg,
    fileName,
    mimeType,
    target: "cue-list",
  });
}

/**
 * Drop a file onto the cue list and measure ms until the cue row appears.
 * DataTransfer prep is excluded from the timer.
 */
export async function measureCueListAssetDropLoadMs(
  page: Page,
  options: {
    fixturePath: string;
    fileName: string;
    mimeType?: string;
    maxMs?: number;
  },
): Promise<number> {
  const maxMs = options.maxMs ?? ASSET_DROP_CUE_LOAD_MAX_MS;
  const mimeType = options.mimeType ?? mimeTypeForFileName(options.fileName);
  const bytes = readFileSync(options.fixturePath);
  const dataTransfer = await createAudioDataTransfer(page, bytes, options.fileName, mimeType);

  const dropZone = sequenceCueList(page);
  await expect(dropZone).toHaveCount(1);

  const startedAtMs = Date.now();
  await dropZone.dispatchEvent("dragover", { dataTransfer });
  await dropZone.dispatchEvent("drop", { dataTransfer });

  let loadMs = 0;
  await expect
    .poll(
      async () => {
        const count = await sequenceCueRow(page, options.fileName).count();
        if (count === 1) {
          loadMs = Date.now() - startedAtMs;
          return true;
        }
        return false;
      },
      { timeout: maxMs + 10_000 },
    )
    .toBe(true);

  expect(
    loadMs,
    `cue list asset drop took ${loadMs}ms until cue row (limit ${maxMs}ms)`,
  ).toBeLessThanOrEqual(maxMs);
  return loadMs;
}

export async function dropAudioOnHotCuePanel(
  page: Page,
  fixturePathArg = WHITE_NOISE_ALT_FIXTURE,
  fileName = WHITE_NOISE_ALT_NAME,
  mimeType?: string,
): Promise<void> {
  await dropAudioFile(page, {
    fixturePath: fixturePathArg,
    fileName,
    mimeType,
    target: "hot-cue-panel",
  });
}
