import { expect, test } from "@playwright/test";
import { gotoApp } from "./helpers/app";
import {
  copySelectedCues,
  deleteSelectedCue,
  pasteSelectedCues,
  startNewProject,
  toggleShowMode,
} from "./helpers/cue-editing";
import {
  expectCueInSequenceList,
  sequenceCueList,
  sequenceCueListPanel,
  sequenceCueRow,
} from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";
import { fileMenuButton } from "./helpers/project-file-menu";
import { renameShow, showNameButton, waitForAutosavedCue } from "./helpers/project-session";

const FIXTURE = "white-noise-playback.wav";
const SAVED_SHOW_NAME = "Saved Before New";
const DEFAULT_SHOW_NAME = "Untitled Show";

function mainAddCueButton(page: import("@playwright/test").Page) {
  return sequenceCueListPanel(page).locator("footer").getByRole("button", { name: "+ Cue ▾" });
}

async function dismissFileMenuHint(page: import("@playwright/test").Page): Promise<void> {
  const close = page.getByRole("alert").getByRole("button", { name: "Close" });
  if (await close.isVisible()) {
    await close.click();
  }
}

test.describe.configure({ mode: "serial" });

test("show mode disables editing controls", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });
  await dismissFileMenuHint(page);

  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);

  const showModeToggle = page.getByRole("button", { name: /Edit mode/i });
  await expect(showModeToggle).toHaveAttribute("aria-pressed", "false");
  await expect(mainAddCueButton(page)).toBeVisible();

  await toggleShowMode(page);

  await expect(page.getByRole("button", { name: /Show mode/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(showNameButton(page)).toBeDisabled();
  await expect(mainAddCueButton(page)).toHaveCount(0);

  await fileMenuButton(page).click();
  await expect(page.getByRole("menuitem", { name: /^Open/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.keyboard.press("Escape");

  await toggleShowMode(page);
  await expect(page.getByRole("button", { name: /Edit mode/i })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(showNameButton(page)).toBeEnabled();
  await expect(mainAddCueButton(page)).toBeVisible();
});

test("show mode blocks cue editing shortcuts", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });
  await dismissFileMenuHint(page);

  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);
  await sequenceCueRow(page, FIXTURE).click();

  await toggleShowMode(page);
  await expect(page.getByRole("button", { name: /Show mode/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await deleteSelectedCue(page);
  await expectCueInSequenceList(page, FIXTURE);

  await copySelectedCues(page);
  await toggleShowMode(page);
  await sequenceCueRow(page, FIXTURE).click();
  await pasteSelectedCues(page);
  await expect(sequenceCueRow(page, FIXTURE)).toHaveCount(1);
});

test("new project persists the previous show before resetting", async ({ page }) => {
  await gotoApp(page, { resetStorage: true });
  await dismissFileMenuHint(page);

  await renameShow(page, SAVED_SHOW_NAME);
  await dropAudioOnCueList(page, fixturePath(FIXTURE), FIXTURE, "audio/wav");
  await expectCueInSequenceList(page, FIXTURE);
  await waitForAutosavedCue(page, FIXTURE);

  await startNewProject(page);

  await expect(showNameButton(page)).toHaveText(DEFAULT_SHOW_NAME);
  await expect(sequenceCueList(page).locator("[data-cue-id]")).toHaveCount(0);

  await fileMenuButton(page).click();
  const storedProjects = page.getByRole("menuitem", { name: "Saved projects" });
  await expect(storedProjects).toBeVisible();
  await storedProjects.hover();
  await page.getByRole("menuitem", { name: SAVED_SHOW_NAME }).click();

  await expect(showNameButton(page)).toHaveText(SAVED_SHOW_NAME);
  await expectCueInSequenceList(page, FIXTURE);
});
