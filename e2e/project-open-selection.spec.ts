import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/app";
import {
  expectCueInSequenceList,
  expectSelectedCueInInspector,
  sequenceCueListPanel,
  sequenceCueListTabs,
} from "./helpers/cue-list-panel";
import { dropAudioOnCueList, WHITE_NOISE_ALT_NAME, WHITE_NOISE_NAME } from "./helpers/drop-audio";
import { exportProjectViaMenu, importProjectBundle } from "./helpers/project-file-menu";
import { waitForAutosavedCue } from "./helpers/project-session";

test("re-import selects the first cue in the first cuelist", async ({ page }) => {
  test.setTimeout(90_000);

  await gotoApp(page, { resetStorage: true });

  await dropAudioOnCueList(page);
  await dropAudioOnCueList(page, undefined, WHITE_NOISE_ALT_NAME);
  await expectCueInSequenceList(page, WHITE_NOISE_NAME);
  await expectCueInSequenceList(page, WHITE_NOISE_ALT_NAME);
  await waitForAutosavedCue(page, WHITE_NOISE_NAME);

  const tablist = sequenceCueListTabs(page);
  await sequenceCueListPanel(page).getByRole("button", { name: "New cue list" }).click();
  const secondTab = tablist.getByRole("tab", { name: /^List 2/ });
  await expect(secondTab).toHaveAttribute("aria-selected", "true");

  await dropAudioOnCueList(page);
  await expectCueInSequenceList(page, WHITE_NOISE_NAME);
  await waitForAutosavedCue(page, WHITE_NOISE_NAME);

  const download = await exportProjectViaMenu(page);
  const bundleDir = mkdtempSync(join(tmpdir(), "gsc-e2e-open-selection-"));
  const bundlePath = join(bundleDir, download.suggestedFilename());
  await download.saveAs(bundlePath);

  await gotoApp(page, { resetStorage: true });
  await importProjectBundle(page, bundlePath);

  await expect(tablist.getByRole("tab", { name: /^Main/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expectSelectedCueInInspector(page, WHITE_NOISE_NAME);
});
