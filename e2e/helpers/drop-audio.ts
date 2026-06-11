import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

export const WHITE_NOISE_FIXTURE = path.join(fixturesDir, "white-noise.wav");
export const WHITE_NOISE_NAME = "white-noise.wav";
export const WHITE_NOISE_ALT_FIXTURE = path.join(fixturesDir, "white-noise-alt.wav");
export const WHITE_NOISE_ALT_NAME = "white-noise-alt.wav";

export type AudioDropTarget = "cue-list" | "hot-cue-panel";

async function createAudioDataTransfer(page: Page, bytes: Buffer, fileName: string) {
  return page.evaluateHandle(
    (data) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(data.bytes)], data.name, { type: "audio/wav" }));
      return dt;
    },
    { bytes: [...bytes], name: fileName },
  );
}

/** Simulate dropping an audio file onto a cue-list or hot-cue drop zone. */
export async function dropAudioFile(
  page: Page,
  options: {
    fixturePath: string;
    fileName: string;
    target: AudioDropTarget;
  },
): Promise<void> {
  const bytes = readFileSync(options.fixturePath);
  const dataTransfer = await createAudioDataTransfer(page, bytes, options.fileName);

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
  const dropZone = (await emptyDropZone.count()) > 0 ? emptyDropZone : hotPanel.locator("div").filter({
    has: page.locator('button:has-text("GO")'),
  }).first();

  await dropZone.dispatchEvent("dragover", { dataTransfer });
  await dropZone.dispatchEvent("drop", { dataTransfer });
}

export async function dropAudioOnCueList(
  page: Page,
  fixturePath = WHITE_NOISE_FIXTURE,
  fileName = WHITE_NOISE_NAME,
): Promise<void> {
  await dropAudioFile(page, { fixturePath, fileName, target: "cue-list" });
}

export async function dropAudioOnHotCuePanel(
  page: Page,
  fixturePath = WHITE_NOISE_ALT_FIXTURE,
  fileName = WHITE_NOISE_ALT_NAME,
): Promise<void> {
  await dropAudioFile(page, { fixturePath, fileName, target: "hot-cue-panel" });
}
