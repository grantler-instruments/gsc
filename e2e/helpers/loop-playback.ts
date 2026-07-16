import { expect, type Page } from "@playwright/test";
import { activeCueRow, activeCuesPanel, openActiveCuesTab, pressTransportGo } from "./active-cues";
import { expectCueInSequenceList, selectSequenceCueRow } from "./cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./drop-audio";
import { enableLoopPlayback } from "./fade-cues";

/** Fixture slice lengths (see e2e/fixtures/generate-*-fixtures.mjs). */
const LOOP_SLICE_SEC: Record<string, number> = {
  "white-noise-playback.wav": 4,
  "test-video-playback.mp4": 4,
};

function loopPollTimeoutMs(cueName: string, iterations: number, bufferMs = 12_000): number {
  const sliceSec = LOOP_SLICE_SEC[cueName] ?? 4;
  return Math.max(40_000, iterations * sliceSec * 1000 + bufferMs);
}

function activeCueProgress(page: Page, cueName: string) {
  return activeCueRow(page, cueName).getByRole("progressbar");
}

function parseLoopFromAriaLabel(ariaLabel: string | null): {
  iteration: number | null;
  total: number | "inf" | null;
} {
  if (!ariaLabel) return { iteration: null, total: null };

  const finite = ariaLabel.match(/loop (\d+)\/(\d+)/i);
  if (finite) {
    return { iteration: Number(finite[1]), total: Number(finite[2]) };
  }

  const infinite = ariaLabel.match(/loop (\d+)×/i);
  if (infinite) {
    return { iteration: Number(infinite[1]), total: "inf" };
  }

  return { iteration: null, total: null };
}

export async function getLoopIterationFromProgress(
  page: Page,
  cueName: string,
): Promise<number | null> {
  const aria = await activeCueProgress(page, cueName).getAttribute("aria-label");
  return parseLoopFromAriaLabel(aria).iteration;
}

export async function getLoopTotalFromProgress(
  page: Page,
  cueName: string,
): Promise<number | "inf" | null> {
  const aria = await activeCueProgress(page, cueName).getAttribute("aria-label");
  return parseLoopFromAriaLabel(aria).total;
}

export async function setLoopIterations(page: Page, iterations: number): Promise<void> {
  const input = page.getByLabel("Iterations");
  await expect(input).toBeVisible();
  await input.fill(String(iterations));
  await input.blur();
}

export async function setInfiniteLoopIterations(page: Page): Promise<void> {
  const input = page.getByLabel("Iterations");
  await expect(input).toBeVisible();
  await input.fill("");
  await input.blur();
}

export async function prepareLoopCue(
  page: Page,
  fileName: string,
  mimeType: string,
  mode: { iterations: number } | { infinite: true },
): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");

  await dropAudioOnCueList(page, fixturePath(fileName), fileName, mimeType);
  await expectCueInSequenceList(page, fileName);
  await selectSequenceCueRow(page, fileName);

  await enableLoopPlayback(page);
  if ("infinite" in mode) {
    await setInfiniteLoopIterations(page);
  } else {
    await setLoopIterations(page, mode.iterations);
  }

  await openActiveCuesTab(page);
}

export async function startSelectedLoopCue(page: Page, fileName: string): Promise<void> {
  await pressTransportGo(page);
  await expect(activeCuesPanel(page).getByRole("button", { name: "Stop all" })).toBeVisible();
  await expect(activeCueRow(page, fileName)).toBeVisible();
  await expect(activeCueProgress(page, fileName)).toBeVisible();
}

export async function expectLoopIteration(
  page: Page,
  cueName: string,
  iteration: number,
  total: number | "inf",
): Promise<void> {
  await expect
    .poll(async () => getLoopIterationFromProgress(page, cueName), {
      timeout: loopPollTimeoutMs(cueName, iteration),
    })
    .toBeGreaterThanOrEqual(iteration);
  await expect.poll(async () => getLoopTotalFromProgress(page, cueName)).toBe(total);
}

export async function expectLoopIterationAtLeast(
  page: Page,
  cueName: string,
  iteration: number,
): Promise<void> {
  await expect
    .poll(async () => getLoopIterationFromProgress(page, cueName), { timeout: 60_000 })
    .toBeGreaterThanOrEqual(iteration);
  await expect.poll(async () => getLoopTotalFromProgress(page, cueName)).toBe("inf");
}
