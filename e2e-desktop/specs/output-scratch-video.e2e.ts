import { browser } from "@wdio/globals";
import { createWdioDesktopDriver } from "../../e2e/adapters/wdio-driver";
import { desktopScratchOutputVideoPlays } from "../../e2e/shared/scenarios/desktop-scratch-output-video";

describe("Desktop output", () => {
  it("scratch project output window plays video without reloading", async () => {
    const driver = createWdioDesktopDriver(browser);
    await desktopScratchOutputVideoPlays(driver);
  });
});
