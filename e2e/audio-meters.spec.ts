import { expect, type Page, test } from "@playwright/test";
import { openActiveCuesTab, transportGoButton } from "./helpers/active-cues";
import { openAddCueMenu } from "./helpers/add-cue";
import { sequenceCueList, sequenceCueRow } from "./helpers/cue-list-panel";

const TONE_NAME = "meter-tone.wav";

async function addToneCue(page: Page) {
  const dataTransfer = await page.evaluateHandle((name) => {
    const rate = 8000;
    const frames = rate * 45;
    const buffer = new ArrayBuffer(44 + frames * 4);
    const view = new DataView(buffer);
    const text = (offset: number, value: string) =>
      Array.from(value).forEach((c, i) => {
        view.setUint8(offset + i, c.charCodeAt(0));
      });
    text(0, "RIFF");
    view.setUint32(4, 36 + frames * 4, true);
    text(8, "WAVEfmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, frames * 4, true);
    for (let i = 0; i < frames; i++) {
      const sample = Math.sin((2 * Math.PI * 400 * i) / rate);
      view.setInt16(44 + i * 4, sample * 16383, true);
      view.setInt16(46 + i * 4, sample * 8191, true);
    }
    const dt = new DataTransfer();
    dt.items.add(new File([buffer], name, { type: "audio/wav" }));
    return dt;
  }, TONE_NAME);
  await sequenceCueList(page).dispatchEvent("drop", { dataTransfer });
  // Drop handlers import asynchronously; GO may still target the previous cue until this finishes.
  await expect(sequenceCueRow(page, TONE_NAME)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(TONE_NAME);
}

// Exercises actual Web Audio analysis rather than fabricated UI values.
test("cue, bus and master meters follow playback, routing and faders", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./");
  await addToneCue(page);
  await page.getByRole("button", { name: "Show audio mixer", exact: true }).click();
  const mixer = page.getByRole("region", { name: "Audio mixer", exact: true });
  await expect(mixer.getByRole("meter", { name: "Master", exact: true })).toHaveAttribute(
    "data-level-db",
    "-60.0",
  );
  await mixer.getByRole("button", { name: "Active audio cues", exact: true }).click();
  const strip = mixer.locator("[data-cue-strip]");
  await expect(strip).toHaveCount(1);
  await expect(strip.getByRole("meter")).toHaveAttribute("data-level-db", "-60.0");
  await mixer.getByRole("button", { name: "+ Bus", exact: true }).click();
  await strip.getByRole("combobox").click();
  await page.getByRole("option", { name: "Bus 1", exact: true }).click();
  await openActiveCuesTab(page);
  await transportGoButton(page).click();
  const cueMeter = strip.getByRole("meter");
  const busMeter = mixer.getByRole("meter", { name: "Bus 1", exact: true });
  const master = mixer.getByRole("meter", { name: "Master", exact: true });
  await expect
    .poll(async () => Number(await cueMeter.getAttribute("data-level-db")))
    .toBeGreaterThan(-40);
  await expect
    .poll(async () => Number(await busMeter.getAttribute("data-level-db")))
    .toBeGreaterThan(-40);
  await expect
    .poll(async () => Number(await master.getAttribute("data-level-db")))
    .toBeGreaterThan(-40);
  // All cue surfaces use the exact same frame, even when more than one view is mounted.
  const cueId = await strip.getAttribute("data-cue-strip");
  await expect
    .poll(() =>
      page
        .locator(`[data-meter-id="cue:${cueId}"]`)
        .evaluateAll((nodes) => new Set(nodes.map((n) => n.getAttribute("data-level-db"))).size),
    )
    .toBe(1);
  await expect
    .poll(async () => Number(await cueMeter.getAttribute("data-level-db")))
    .toBeCloseTo(-6, 0);
  await page.screenshot({ path: "test-results/audio-mixer-playing.png" });
  await mixer.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(busMeter).toHaveAttribute("data-level-db", "-60.0");
  await expect(master).toHaveAttribute("data-level-db", "-60.0");
  await expect
    .poll(async () => Number(await cueMeter.getAttribute("data-level-db")))
    .toBeGreaterThan(-40);
  await mixer.getByRole("button", { name: "Unmute", exact: true }).click();
  await expect
    .poll(async () => Number(await master.getAttribute("data-level-db")))
    .toBeGreaterThan(-40);
  await strip.getByRole("slider", { name: `${TONE_NAME} Volume`, exact: true }).fill("0");
  await expect(cueMeter).toHaveAttribute("data-level-db", "-60.0");
  await strip.getByRole("slider", { name: `${TONE_NAME} Volume`, exact: true }).fill("1");
  await strip.getByRole("slider", { name: `${TONE_NAME} Pan`, exact: true }).fill("-1");
  await expect(cueMeter).toHaveAttribute("aria-valuetext", /R −∞ dBFS/);
  await page.getByRole("button", { name: /^Edit mode/ }).click();
  await expect(
    strip.getByRole("slider", { name: `${TONE_NAME} Volume`, exact: true }),
  ).toBeDisabled();
  await expect(mixer.getByRole("button", { name: "Mute", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Panic", exact: true }).click();
  await expect(strip.getByText(/^Idle/)).toBeVisible();
  await expect(master).toHaveAttribute("data-level-db", "-60.0");
});

test("live audio meters start on GO and stop with the cue", async ({ page }) => {
  // Synthetic microphone: exercise MediaStreamSource without opening real hardware.
  await page.addInitScript(() => {
    const streams: MediaStream[] = [];
    Object.assign(window, { testInputStreams: streams });
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new AudioContext();
      await ctx.resume();
      const tone = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.25;
      const output = ctx.createMediaStreamDestination();
      tone.connect(gain).connect(output);
      tone.start();
      streams.push(output.stream);
      return output.stream;
    };
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("./");
  await page.getByRole("button", { name: "Show audio mixer", exact: true }).click();
  const mixer = page.getByRole("region", { name: "Audio mixer", exact: true });
  expect(
    await page.evaluate(
      () => (window as unknown as { testInputStreams: MediaStream[] }).testInputStreams.length,
    ),
  ).toBe(0);
  await openAddCueMenu(page);
  await page.getByRole("menuitem", { name: "Live audio", exact: true }).click();
  await transportGoButton(page).click();
  const strip = mixer.locator("[data-cue-strip]").filter({ hasText: "Live audio cue" });
  await expect(strip).toHaveCount(1);
  await expect
    .poll(async () => Number(await strip.getByRole("meter").getAttribute("data-level-db")))
    .toBeGreaterThan(-20);
  await addToneCue(page);
  await transportGoButton(page).click();
  await expect(mixer.locator("[data-cue-strip]")).toHaveCount(2);
  await expect(
    mixer
      .locator("[data-cue-strip]")
      .filter({ hasText: TONE_NAME })
      .getByText("Playing", { exact: true }),
  ).toBeVisible();
  await strip.getByRole("slider", { name: "Live audio cue Volume", exact: true }).fill("0");
  await expect
    .poll(async () =>
      Number(
        await mixer
          .getByRole("meter", { name: "Master", exact: true })
          .getAttribute("data-level-db"),
      ),
    )
    .toBeGreaterThan(-20);
  await expect(strip.getByRole("meter")).toHaveAttribute("data-level-db", "-60.0");
  await mixer.getByRole("button", { name: "Active audio cues", exact: true }).click();
  await page.getByRole("button", { name: "Panic", exact: true }).click();
  await expect(strip.getByText(/^Idle/)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { testInputStreams: MediaStream[] }).testInputStreams.every((s) =>
          s.getTracks().every((t) => t.readyState === "ended"),
        ),
      ),
    )
    .toBe(true);
});
