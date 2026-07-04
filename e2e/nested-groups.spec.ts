import { expect, test } from "@playwright/test";
import {
  activeCueRow,
  activeCuesEmptyMessage,
  openActiveCuesTab,
  pressTransportGo,
} from "./helpers/active-cues";
import { addCueType } from "./helpers/add-cue";
import { gotoApp } from "./helpers/app";
import {
  dragCueIntoContainer,
  expandContainerCue,
  renameSelectedCue,
} from "./helpers/container-cues";
import { expectCueInSequenceList, sequenceCueRow } from "./helpers/cue-list-panel";
import { dropAudioOnCueList, fixturePath } from "./helpers/drop-audio";

const SHORT_A = "white-noise-short-a.wav";
const SHORT_B = "white-noise-short-b.wav";

test.describe.configure({ mode: "serial" });

async function addNamedContainer(
  page: import("@playwright/test").Page,
  type: "Sequence" | "Parallel",
  name: string,
): Promise<void> {
  await addCueType(page, type);
  await renameSelectedCue(page, name);
  await expect(sequenceCueRow(page, name)).toHaveCount(1);
}

async function dropShortClips(page: import("@playwright/test").Page): Promise<void> {
  await dropAudioOnCueList(page, fixturePath(SHORT_A), SHORT_A, "audio/wav");
  await dropAudioOnCueList(page, fixturePath(SHORT_B), SHORT_B, "audio/wav");
  await expectCueInSequenceList(page, SHORT_A);
  await expectCueInSequenceList(page, SHORT_B);
}

test("sequence > parallel > sequence runs nested leaf steps in order @structure", async ({
  page,
}) => {
  test.setTimeout(90_000);

  await gotoApp(page);

  await addNamedContainer(page, "Sequence", "Root Seq");
  await addNamedContainer(page, "Parallel", "Mid Par");
  await addNamedContainer(page, "Sequence", "Inner Seq");

  await dragCueIntoContainer(page, "Inner Seq", "Mid Par");
  await dragCueIntoContainer(page, "Mid Par", "Root Seq");

  await dropShortClips(page);

  await expandContainerCue(page, "Root Seq");
  await expandContainerCue(page, "Mid Par");
  await dragCueIntoContainer(page, SHORT_A, "Inner Seq");
  await dragCueIntoContainer(page, SHORT_B, "Inner Seq");
  await expandContainerCue(page, "Inner Seq");

  await expect(sequenceCueRow(page, "Root Seq").getByText(/1 cue\(s\) · sequential/)).toBeVisible();
  await expect(sequenceCueRow(page, "Mid Par").getByText(/1 cue\(s\) · parallel/)).toBeVisible();
  await expect(
    sequenceCueRow(page, "Inner Seq").getByText(/2 cue\(s\) · sequential/),
  ).toBeVisible();

  await sequenceCueRow(page, "Root Seq").click();
  await openActiveCuesTab(page);
  await pressTransportGo(page);

  await expect(activeCueRow(page, SHORT_A)).toBeVisible({ timeout: 10_000 });
  await expect(activeCueRow(page, SHORT_A)).toBeHidden({ timeout: 15_000 });

  await expect
    .poll(
      async () => {
        if (await activeCueRow(page, SHORT_B).isVisible()) return "active";
        if (await sequenceCueRow(page, "Inner Seq").getByText("Playing step 2 of 2").isVisible()) {
          return "step";
        }
        return "";
      },
      { timeout: 15_000 },
    )
    .not.toBe("");

  await expect(activeCueRow(page, SHORT_B)).toBeVisible({ timeout: 10_000 });
  await expect(activeCueRow(page, SHORT_B)).toBeHidden({ timeout: 15_000 });
  await expect(activeCuesEmptyMessage(page)).toBeVisible({ timeout: 10_000 });
});

test("parallel > sequence > parallel fires nested leaf cues together @structure", async ({
  page,
}) => {
  test.setTimeout(90_000);

  await gotoApp(page);

  await addNamedContainer(page, "Parallel", "Root Par");
  await addNamedContainer(page, "Sequence", "Mid Seq");
  await addNamedContainer(page, "Parallel", "Inner Par");

  await dragCueIntoContainer(page, "Inner Par", "Mid Seq");
  await dragCueIntoContainer(page, "Mid Seq", "Root Par");

  await dropShortClips(page);

  await expandContainerCue(page, "Root Par");
  await expandContainerCue(page, "Mid Seq");
  await dragCueIntoContainer(page, SHORT_A, "Inner Par");
  await dragCueIntoContainer(page, SHORT_B, "Inner Par");
  await expandContainerCue(page, "Inner Par");

  await expect(sequenceCueRow(page, "Root Par").getByText(/1 cue\(s\) · parallel/)).toBeVisible();
  await expect(sequenceCueRow(page, "Mid Seq").getByText(/1 cue\(s\) · sequential/)).toBeVisible();
  await expect(sequenceCueRow(page, "Inner Par").getByText(/2 cue\(s\) · parallel/)).toBeVisible();

  await sequenceCueRow(page, "Root Par").click();
  await openActiveCuesTab(page);
  await pressTransportGo(page);

  await expect(activeCueRow(page, SHORT_A)).toBeVisible({ timeout: 10_000 });
  await expect(activeCueRow(page, SHORT_B)).toBeVisible({ timeout: 10_000 });
});
