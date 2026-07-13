import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import {
  fixturePath,
  mimeTypeForFileName,
  WHITE_NOISE_ALT_FIXTURE,
  WHITE_NOISE_ALT_NAME,
  WHITE_NOISE_FIXTURE,
  WHITE_NOISE_NAME,
} from "../shared/fixtures";

export {
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
    const dropZone = page.locator('[data-gsc-drop-zone="cue-list"]');
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
