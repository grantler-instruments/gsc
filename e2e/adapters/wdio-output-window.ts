import { OUTPUT_STABLE_MS } from "../shared/output-window";

type WdioBrowser = WebdriverIO.Browser;

async function countOutputVideoElements(browser: WdioBrowser): Promise<number> {
  const first = await browser.$("[data-gsc-output-stage] video");
  if (!(await first.isExisting())) return 0;

  const second = await browser.$("[data-gsc-output-stage] video:nth-of-type(2)");
  if (await second.isExisting()) return 2;

  return 1;
}

async function waitForOutputVideoCount(
  browser: WdioBrowser,
  count: number,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await countOutputVideoElements(browser)) === count) return;
    await browser.pause(200);
  }
  throw new Error(`Expected ${count} output video element(s)`);
}

/** Wait until the output stage mounts a video element (no execute/getProperty on the output webview). */
export async function waitForOutputVideoElementViaElements(
  browser: WdioBrowser,
  startedAtMs: number,
  timeoutMs: number,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await countOutputVideoElements(browser)) >= 1) {
      return Date.now() - startedAtMs;
    }
    await browser.pause(200);
  }
  throw new Error("Timed out waiting for output video element");
}

/** Guard against output reload loops and duplicate video mounts without reading playback state. */
export async function expectOutputVideoElementStableViaElements(
  browser: WdioBrowser,
  options: { stableMs?: number } = {},
): Promise<void> {
  const stableMs = options.stableMs ?? OUTPUT_STABLE_MS;
  const outputUrl = await browser.getUrl();

  await waitForOutputVideoCount(browser, 1, 10_000);
  await browser.pause(stableMs);

  if ((await browser.getUrl()) !== outputUrl) {
    throw new Error("Output page reloaded during stable window");
  }

  await waitForOutputVideoCount(browser, 1, 10_000);
}
