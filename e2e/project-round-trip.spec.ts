import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/app";
import { expectCueInSequenceList } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";
import { exportProjectViaMenu, importProjectBundle } from "./helpers/project-file-menu";
import { renameShow, waitForAutosavedCue } from "./helpers/project-session";

const FIXTURE = "white-noise-playback.wav";
const SHOW_NAME = "Export Round Trip";

test.describe.configure({ mode: "serial" });

test("export .gsc.zip and re-import restores cues and assets", async ({ page }) => {
  test.setTimeout(90_000);

  await gotoApp(page, { resetStorage: true });
  await renameShow(page, SHOW_NAME);

  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);
  await waitForAutosavedCue(page, FIXTURE);

  const download = await exportProjectViaMenu(page);
  const bundleDir = mkdtempSync(join(tmpdir(), "gsc-e2e-export-"));
  const bundlePath = join(bundleDir, download.suggestedFilename());
  await download.saveAs(bundlePath);

  await gotoApp(page, { resetStorage: true });
  await importProjectBundle(page, bundlePath);

  await expect(page.getByRole("button", { name: "Edit show details" })).toHaveText(SHOW_NAME);
  await expectCueInSequenceList(page, FIXTURE);
  await expect(
    page.locator('[data-gsc-drop-zone="assets"]').getByText(FIXTURE, { exact: true }),
  ).toBeVisible({
    timeout: 30_000,
  });
});
