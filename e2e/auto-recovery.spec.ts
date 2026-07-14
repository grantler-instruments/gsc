import { expect, test } from "@playwright/test";
import {
  expectCueInSequenceList,
  sequenceCueListPanel,
  sequenceCueListTabs,
} from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";
import {
  renameShow,
  showNameButton,
  waitForAppReady,
  waitForAutosavedCue,
  waitForAutosavedShowName,
} from "./helpers/project-session";

const RECOVERED_SHOW_NAME = "Recovered Show";
const RECOVERED_LIST_NAME = "Act 2";
const RECOVERED_AUDIO = "white-noise-playback.wav";

test("reload restores autosaved project state from the browser session", async ({ page }) => {
  test.setTimeout(90_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");
  await waitForAppReady(page);

  await renameShow(page, RECOVERED_SHOW_NAME);

  const tablist = sequenceCueListTabs(page);
  await sequenceCueListPanel(page).getByRole("button", { name: "New cue list" }).click();
  const newListTab = tablist.getByRole("tab").last();
  await newListTab.dblclick();
  const renameInput = tablist.locator("input");
  await renameInput.fill(RECOVERED_LIST_NAME);
  await renameInput.press("Enter");
  await expect(
    tablist.getByRole("tab", { name: new RegExp(`^${RECOVERED_LIST_NAME}`) }),
  ).toBeVisible();

  await dropAudioOnCueList(page, fixturePath(RECOVERED_AUDIO), RECOVERED_AUDIO, "audio/wav");
  await expectCueInSequenceList(page, RECOVERED_AUDIO);

  await waitForAutosavedShowName(page, RECOVERED_SHOW_NAME);
  await waitForAutosavedCue(page, RECOVERED_AUDIO);

  await page.reload();
  await waitForAppReady(page);

  await expect(showNameButton(page)).toHaveText(RECOVERED_SHOW_NAME);
  await expect(
    tablist.getByRole("tab", { name: new RegExp(`^${RECOVERED_LIST_NAME}`) }),
  ).toBeVisible();
  await tablist.getByRole("tab", { name: new RegExp(`^${RECOVERED_LIST_NAME}`) }).click();
  await expectCueInSequenceList(page, RECOVERED_AUDIO);
});
