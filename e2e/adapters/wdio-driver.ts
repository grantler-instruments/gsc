import { readFileSync } from "node:fs";
import type { AppDriver, WaitUntilOptions } from "../shared/driver";
import type { DesktopScratchOutputVideoDriver } from "../shared/scenarios/desktop-scratch-output-video";
import {
  expectOutputVideoElementStableViaElements,
  waitForOutputVideoElementViaElements,
} from "./wdio-output-window";

type WdioBrowser = WebdriverIO.Browser;

function roleSelector(role: string): string {
  switch (role) {
    case "button":
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
    const labelSelectors =
      role === "button"
        ? [`button[aria-label="${name}"]`, `[role="${role}"][aria-label="${name}"]`]
        : [`[role="${role}"][aria-label="${name}"]`];
    for (const selector of labelSelectors) {
      const byLabel = await browser.$(selector);
      if (await byLabel.isExisting()) {
        return byLabel;
      }
    }
  }

  if (role === "button" && name === "Output") {
    const byAction = await browser.$('[data-gsc-action="open-output"]');
    if (await byAction.isExisting()) {
      return byAction;
    }

    const byTitle = await browser.$('button[title="Open audience output window"]');
    if (await byTitle.isExisting()) {
      return byTitle;
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

async function dismissStartupDialogIfPresent(browser: WdioBrowser): Promise<void> {
  try {
    const newShow = await findByRole(browser, "button", "New Show");
    if (await newShow.isDisplayed()) {
      await newShow.click();
      await browser.pause(500);
    }
  } catch {
    /* no startup dialog */
  }
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

async function waitForStartupOrAppReady(browser: WdioBrowser): Promise<void> {
  await waitUntil(
    browser,
    async () => {
      try {
        const newShow = await findByRole(browser, "button", "New Show");
        if (await newShow.isDisplayed()) return true;
      } catch {
        /* not on startup dialog */
      }

      try {
        const go = await findByRole(browser, "button", "GO");
        return await go.isDisplayed();
      } catch {
        return false;
      }
    },
    { timeout: 30_000, timeoutMsg: "Timed out waiting for startup dialog or transport GO button" },
  );
}

async function findMainWindowHandle(browser: WdioBrowser): Promise<string> {
  for (const handle of await browser.getWindowHandles()) {
    await browser.switchToWindow(handle);
    if (await browser.$('[data-gsc-drop-zone="cue-list"]').isExisting()) {
      return handle;
    }
  }

  const [first] = await browser.getWindowHandles();
  if (!first) throw new Error("No WebDriver window handles available");
  return first;
}

async function findOutputWindowHandle(browser: WdioBrowser): Promise<string | null> {
  for (const handle of await browser.getWindowHandles()) {
    await browser.switchToWindow(handle);
    if (await browser.$("[data-gsc-output-stage]").isExisting()) {
      return handle;
    }
  }
  return null;
}

/** Count cue rows by data attribute — WebKit WebDriver getText() omits cue names on Linux. */
async function countCueRowsNamedInMainWindow(
  browser: WdioBrowser,
  mainHandle: string,
  fileName: string,
): Promise<number> {
  await browser.switchToWindow(mainHandle);
  const rows = await browser.$$(
    `[data-gsc-drop-zone="cue-list"] [data-cue-id][data-cue-name="${fileName}"]`,
  );
  return await rows.length;
}

async function activeCueRowVisibleViaAttribute(
  browser: WdioBrowser,
  mainHandle: string,
  cueName: string,
): Promise<boolean> {
  await browser.switchToWindow(mainHandle);
  const rows = await browser.$$(`aside [role="tabpanel"] li[data-cue-name="${cueName}"]`);
  return (await rows.length) > 0;
}

export function createWdioDriver(browser: WdioBrowser): AppDriver {
  return createWdioDesktopDriver(browser);
}

export function createWdioDesktopDriver(browser: WdioBrowser): DesktopScratchOutputVideoDriver {
  let mainWindowHandle: string | undefined;
  let outputWindowHandle: string | undefined;

  const driver: DesktopScratchOutputVideoDriver = {
    async gotoApp() {
      await waitForStartupOrAppReady(browser);
      await dismissStartupDialogIfPresent(browser);
      await waitForAppReady(browser);
      mainWindowHandle = await findMainWindowHandle(browser);
      await browser.switchToWindow(mainWindowHandle);
    },

    async dismissStartupDialogIfPresent() {
      await browser.switchToWindow(mainWindowHandle ?? (await findMainWindowHandle(browser)));
      await dismissStartupDialogIfPresent(browser);
    },

    async clickByRole(role, name) {
      await browser.switchToWindow(mainWindowHandle ?? (await findMainWindowHandle(browser)));
      const element = await findByRole(browser, role, name);
      await element.waitForDisplayed({ timeout: 10_000 });
      await element.click();
    },

    async pressKey(key) {
      await browser.switchToWindow(mainWindowHandle ?? (await findMainWindowHandle(browser)));
      await browser.keys(key);
    },

    async dispatchAudioDropOnCueList(filePath, fileName, mimeType) {
      await browser.switchToWindow(mainWindowHandle ?? (await findMainWindowHandle(browser)));
      const base64 = readFileSync(filePath).toString("base64");
      await browser.execute(
        (data) => {
          const binary = atob(data.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const dt = new DataTransfer();
          dt.items.add(new File([bytes], data.name, { type: data.mimeType }));
          const dropZone = document.querySelector('[data-gsc-drop-zone="cue-list"]');
          if (!dropZone) throw new Error("Cue list drop zone not found");
          for (const type of ["dragenter", "dragover", "drop"] as const) {
            dropZone.dispatchEvent(
              new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }),
            );
          }
        },
        { base64, name: fileName, mimeType },
      );
    },

    async expectCueInSequenceList(fileName) {
      mainWindowHandle ??= await findMainWindowHandle(browser);
      const mainHandle = mainWindowHandle;
      await browser.switchToWindow(mainHandle);
      await waitUntil(
        browser,
        async () => (await countCueRowsNamedInMainWindow(browser, mainHandle, fileName)) === 1,
        {
          timeout: 60_000,
          timeoutMsg: `Expected one cue row named "${fileName}"`,
        },
      );
    },

    async expectActiveCueVisible(cueName) {
      mainWindowHandle ??= await findMainWindowHandle(browser);
      const mainHandle = mainWindowHandle;
      await browser.switchToWindow(mainHandle);
      await waitUntil(
        browser,
        async () => activeCueRowVisibleViaAttribute(browser, mainHandle, cueName),
        {
          timeout: 15_000,
          timeoutMsg: `Expected active cue "${cueName}"`,
        },
      );
    },

    async waitForRole(role, name, options) {
      await browser.switchToWindow(mainWindowHandle ?? (await findMainWindowHandle(browser)));
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

    async openOutputWindow() {
      mainWindowHandle ??= await findMainWindowHandle(browser);
      await browser.switchToWindow(mainWindowHandle);

      await waitUntil(
        browser,
        async () => {
          try {
            const outputButton = await findByRole(browser, "button", "Output");
            return await outputButton.isDisplayed();
          } catch {
            return false;
          }
        },
        { timeout: 30_000, timeoutMsg: "Timed out waiting for Output button" },
      );

      const outputButton = await findByRole(browser, "button", "Output");
      const handlesBefore = await browser.getWindowHandles();
      await outputButton.click();

      await waitUntil(
        browser,
        async () => {
          const handles = await browser.getWindowHandles();
          if (handles.length <= handlesBefore.length) return false;
          const handle = await findOutputWindowHandle(browser);
          if (!handle) return false;
          outputWindowHandle = handle;
          return true;
        },
        { timeout: 45_000, timeoutMsg: "Timed out waiting for Tauri output window" },
      );

      await browser.switchToWindow(outputWindowHandle!);
    },

    async switchToMainWindow() {
      mainWindowHandle ??= await findMainWindowHandle(browser);
      await browser.switchToWindow(mainWindowHandle);
    },

    async switchToOutputWindow() {
      outputWindowHandle ??= (await findOutputWindowHandle(browser)) ?? undefined;
      if (!outputWindowHandle) {
        throw new Error("Output window handle not found");
      }
      await browser.switchToWindow(outputWindowHandle);
    },

    async wait(ms) {
      await browser.pause(ms);
    },

    async waitForOutputVideoPlaying(startedAtMs, timeoutMs) {
      outputWindowHandle ??= (await findOutputWindowHandle(browser)) ?? undefined;
      if (!outputWindowHandle) {
        throw new Error("Output window handle not found");
      }
      await browser.switchToWindow(outputWindowHandle);
      return waitForOutputVideoElementViaElements(browser, startedAtMs, timeoutMs);
    },

    async expectOutputPlaybackStable(options) {
      outputWindowHandle ??= (await findOutputWindowHandle(browser)) ?? undefined;
      if (!outputWindowHandle) {
        throw new Error("Output window handle not found");
      }
      await browser.switchToWindow(outputWindowHandle);
      await expectOutputVideoElementStableViaElements(browser, options);
    },
  };

  return driver;
}
