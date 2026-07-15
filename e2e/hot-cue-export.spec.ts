import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { activeCueRow, transportGoButton } from "./helpers/active-cues";
import { gotoApp } from "./helpers/app";
import { expectCueInSequenceList, sequenceCueRow } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, dropAudioOnHotCuePanel, fixturePath } from "./helpers/drop-audio";
import { hotCuePanel } from "./helpers/hot-cues";
import { exportProjectViaMenu, importProjectBundle } from "./helpers/project-file-menu";
import { waitForAutosavedCue } from "./helpers/project-session";

test.describe.configure({ mode: "serial" });

const MAIN_AUDIO = "white-noise-playback.wav";
const HOT_AUDIO = "white-noise-playback.flac";

test("export and re-import preserves hot cues and stacking playback", async ({ page }) => {
  test.setTimeout(120_000);

  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page, fixturePath(MAIN_AUDIO), MAIN_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, MAIN_AUDIO);
  await sequenceCueRow(page, MAIN_AUDIO).click();

  await dropAudioOnHotCuePanel(page, fixturePath(HOT_AUDIO), HOT_AUDIO, "audio/flac");
  await expect(hotCuePanel(page)).toContainText(HOT_AUDIO);

  await waitForAutosavedCue(page, MAIN_AUDIO);
  await waitForAutosavedCue(page, HOT_AUDIO);

  const download = await exportProjectViaMenu(page);
  const bundleDir = mkdtempSync(join(tmpdir(), "gsc-e2e-hot-export-"));
  const bundlePath = join(bundleDir, download.suggestedFilename());
  await download.saveAs(bundlePath);

  await gotoApp(page, { resetStorage: true });
  await importProjectBundle(page, bundlePath);

  await expectCueInSequenceList(page, MAIN_AUDIO);
  await expect(hotCuePanel(page)).toContainText(HOT_AUDIO);

  await sequenceCueRow(page, MAIN_AUDIO).click();
  await transportGoButton(page).click();
  await hotCuePanel(page).getByRole("button", { name: "GO" }).first().click();

  await expect(activeCueRow(page, MAIN_AUDIO)).toBeVisible();
  await expect(activeCueRow(page, HOT_AUDIO)).toBeVisible();
});
