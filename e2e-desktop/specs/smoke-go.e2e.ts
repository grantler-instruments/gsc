import { browser } from "@wdio/globals";
import { createWdioDriver } from "../../e2e/adapters/wdio-driver";
import { PLAYBACK_WAV, PLAYBACK_WAV_MIME } from "../../e2e/shared/constants";
import { smokeGoPlaysAudio } from "../../e2e/shared/scenarios/smoke-go-plays-audio";

describe("Desktop smoke", () => {
  it("GO plays audio with advancing progress", async () => {
    const driver = createWdioDriver(browser);
    await smokeGoPlaysAudio(driver, {
      fileName: PLAYBACK_WAV,
      mimeType: PLAYBACK_WAV_MIME,
    });
  });
});
