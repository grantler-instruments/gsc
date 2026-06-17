import type { AppDriver } from "./driver";

export function countCueRowsNamed(fileName: string): number {
  const list = document.querySelector('[data-gsc-drop-zone="cue-list"]');
  if (!list) return 0;
  return [...list.querySelectorAll("[data-cue-id]")].filter((row) => {
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.textContent?.trim() === fileName) return true;
      node = walker.nextNode();
    }
    return false;
  }).length;
}

export function readActiveCueProgress(cueName: string): number {
  const aside = document.querySelector("aside");
  const panel = aside?.querySelector('[role="tabpanel"]');
  if (!panel) return -1;
  const row = [...panel.querySelectorAll("li")].find((item) => item.textContent?.includes(cueName));
  if (!row) return -1;
  const progress = row.querySelector('[role="progressbar"]');
  return Number(progress?.getAttribute("aria-valuenow") ?? -1);
}

export function activeCueRowVisible(cueName: string): boolean {
  const aside = document.querySelector("aside");
  const panel = aside?.querySelector('[role="tabpanel"]');
  if (!panel) return false;
  return [...panel.querySelectorAll("li")].some((item) => item.textContent?.includes(cueName));
}

export async function dropAudioOnCueList(
  driver: AppDriver,
  filePath: string,
  fileName: string,
  mimeType: string,
): Promise<void> {
  await driver.dispatchAudioDropOnCueList(filePath, fileName, mimeType);
}

export async function expectCueInSequenceList(driver: AppDriver, fileName: string): Promise<void> {
  await driver.waitUntil(async () => (await driver.evaluate(countCueRowsNamed, fileName)) === 1, {
    timeout: 15_000,
    timeoutMsg: `Expected one cue row named "${fileName}"`,
  });
}

export async function openActiveCuesTab(driver: AppDriver): Promise<void> {
  await driver.clickByRole("tab", "Active");
}

export async function pressTransportGo(driver: AppDriver): Promise<void> {
  await driver.pressKey("Space");
}

export async function expectActiveCueVisible(driver: AppDriver, cueName: string): Promise<void> {
  await driver.waitUntil(async () => driver.evaluate(activeCueRowVisible, cueName), {
    timeout: 10_000,
    timeoutMsg: `Expected active cue "${cueName}"`,
  });
}

export async function expectPlaybackProgressToAdvance(
  driver: AppDriver,
  cueName: string,
): Promise<void> {
  await driver.waitUntil(async () => (await driver.evaluate(readActiveCueProgress, cueName)) > 0, {
    timeout: 15_000,
    timeoutMsg: `Expected playback progress for "${cueName}"`,
  });

  const first = await driver.evaluate(readActiveCueProgress, cueName);
  await driver.waitUntil(
    async () => (await driver.evaluate(readActiveCueProgress, cueName)) > first,
    {
      timeout: 15_000,
      timeoutMsg: `Expected advancing playback for "${cueName}"`,
    },
  );
}
