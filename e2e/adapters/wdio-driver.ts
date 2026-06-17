import { readFileSync } from "node:fs";
import type { AppDriver, WaitUntilOptions } from "../shared/driver";

type WdioBrowser = WebdriverIO.Browser;

function roleSelector(role: string): string {
  switch (role) {
    case "button":
      // Native <button> has implicit button role; Playwright getByRole matches both.
      return 'button,[role="button"]';
    default:
      return `[role="${role}"]`;
  }
}

async function elementLabel(element: WebdriverIO.Element): Promise<string> {
  const text = (await element.getText())?.trim();
  if (text) return text;

  const innerText = (await element.getAttribute("innerText"))?.trim();
  if (innerText) return innerText;

  const ariaLabel = (await element.getAttribute("aria-label"))?.trim();
  if (ariaLabel) return ariaLabel;

  return "";
}

async function findByRole(
  browser: WdioBrowser,
  role: string,
  name: string | RegExp,
): Promise<WebdriverIO.Element> {
  const pattern =
    name instanceof RegExp ? name : new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

  if (typeof name === "string") {
    const byLabel = await browser.$(`[role="${role}"][aria-label="${name}"]`);
    if (await byLabel.isExisting()) {
      return byLabel;
    }
  }

  if (role === "button" && name === "GO") {
    const footer = await browser.$("footer");
    if (await footer.isExisting()) {
      const footerButtons = await footer.$$(roleSelector(role));
      for (const element of footerButtons) {
        const label = await elementLabel(element);
        if (pattern.test(label)) return element;
      }
    }
  }

  const elements = await browser.$$(roleSelector(role));
  for (const element of elements) {
    const label = await elementLabel(element);
    if (pattern.test(label)) return element;
  }

  throw new Error(`Could not find role="${role}" matching ${String(name)}`);
}

async function waitUntil(
  browser: WdioBrowser,
  predicate: () => Promise<boolean>,
  options?: WaitUntilOptions,
): Promise<void> {
  const timeout = options?.timeout ?? 10_000;
  const interval = options?.interval ?? 200;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await predicate()) return;
    await browser.pause(interval);
  }

  throw new Error(options?.timeoutMsg ?? "waitUntil timed out");
}

async function waitForAppReady(browser: WdioBrowser): Promise<void> {
  await waitUntil(
    browser,
    async () => {
      try {
        const go = await findByRole(browser, "button", "GO");
        return await go.isDisplayed();
      } catch {
        return false;
      }
    },
    { timeout: 30_000, timeoutMsg: "Timed out waiting for app transport GO button" },
  );
}

export function createWdioDriver(browser: WdioBrowser): AppDriver {
  return {
    async gotoApp() {
      await waitForAppReady(browser);
    },

    async clickByRole(role, name) {
      const element = await findByRole(browser, role, name);
      await element.waitForDisplayed({ timeout: 10_000 });
      await element.click();
    },

    async pressKey(key) {
      await browser.keys(key);
    },

    async dispatchAudioDropOnCueList(filePath, fileName, mimeType) {
      const bytes = [...readFileSync(filePath)];
      await browser.execute(
        (data) => {
          const dt = new DataTransfer();
          dt.items.add(new File([new Uint8Array(data.bytes)], data.name, { type: data.mimeType }));
          const dropZone = document.querySelector('[data-gsc-drop-zone="cue-list"]');
          if (!dropZone) throw new Error("Cue list drop zone not found");
          dropZone.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: dt }));
          dropZone.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: dt }));
        },
        { bytes, name: fileName, mimeType },
      );
    },

    async expectCueInSequenceList(fileName) {
      const { expectCueInSequenceList: expectCue } = await import("../shared/actions");
      await expectCue(this, fileName);
    },

    async waitForRole(role, name, options) {
      const timeout = options?.timeout ?? 10_000;
      const start = Date.now();
      while (Date.now() - start < timeout) {
        try {
          const element = await findByRole(browser, role, name);
          if (await element.isDisplayed()) return;
        } catch {
          /* keep polling */
        }
        await browser.pause(200);
      }
      throw new Error(`Timed out waiting for role="${role}" matching ${String(name)}`);
    },

    async evaluate(fn, arg) {
      return browser.execute(fn, arg);
    },

    async waitUntil(predicate, options) {
      await waitUntil(browser, predicate, options);
    },
  };
}
