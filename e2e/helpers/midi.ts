import { expect, type Page } from "@playwright/test";
import {
  activeCueRow,
  activeCuesEmptyMessage,
  activeCuesPanel,
  openActiveCuesTab,
} from "./active-cues";
import { pressModShortcut } from "./app";
import { selectSequenceCueRow } from "./cue-list-panel";

export const E2E_MIDI_INPUT_ID = "e2e-midi-in";
export const E2E_MIDI_INPUT_NAME = "E2E MIDI Input";

/** C2 — first note used by auto-map notes → cues. */
export const AUTO_MAP_START_NOTE = 36;

/** Install a fake Web MIDI input before the app loads (call before `page.goto`). */
export async function installMidiMock(page: Page): Promise<void> {
  await page.addInitScript(
    ({ inputId, inputName }) => {
      const listeners = new Set<(event: MIDIMessageEvent) => void>();

      const fakeInput = {
        id: inputId,
        name: inputName,
        type: "input",
        manufacturer: "",
        version: "",
        state: "connected",
        connection: "open",
        addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
          if (type === "midimessage" && typeof listener === "function") {
            listeners.add(listener as (event: MIDIMessageEvent) => void);
          }
        },
        removeEventListener(
          type: string,
          listener: EventListenerOrEventListenerObject | null,
        ): void {
          if (type === "midimessage" && typeof listener === "function") {
            listeners.delete(listener as (event: MIDIMessageEvent) => void);
          }
        },
        dispatchEvent(): boolean {
          return true;
        },
        onstatechange: null,
        open(): Promise<MIDIPort> {
          return Promise.resolve(fakeInput as MIDIInput);
        },
        close(): Promise<MIDIPort> {
          return Promise.resolve(fakeInput as MIDIInput);
        },
      } satisfies MIDIInput;

      const inputs = new Map<string, MIDIInput>([[inputId, fakeInput as MIDIInput]]);

      navigator.requestMIDIAccess = async () =>
        ({
          inputs,
          outputs: new Map(),
          sysexEnabled: false,
          onstatechange: null,
          addEventListener() {},
          removeEventListener() {},
        }) as MIDIAccess;

      (window as Window & { __gscE2eSendMidi?: (data: number[]) => void }).__gscE2eSendMidi = (
        data: number[],
      ) => {
        const bytes = new Uint8Array(data);
        for (const listener of listeners) {
          listener({ data: bytes } as MIDIMessageEvent);
        }
      };
    },
    { inputId: E2E_MIDI_INPUT_ID, inputName: E2E_MIDI_INPUT_NAME },
  );
}

const DEFAULT_DEBOUNCE_WAIT_MS = 110;

export type SendMidiOptions = {
  /** When true (default), wait for the debounce window before returning. */
  waitForDebounce?: boolean;
};

async function waitForMidiMock(page: Page): Promise<void> {
  // Brief pause so async Web MIDI attach can complete after input selection.
  await page.waitForFunction(
    () => (window as Window & { __gscE2eSendMidi?: (data: number[]) => void }).__gscE2eSendMidi,
  );
}

export async function sendMidiBytes(
  page: Page,
  bytes: number[],
  options: SendMidiOptions = {},
): Promise<void> {
  await waitForMidiMock(page);
  await page.evaluate(
    ({ data }) => {
      const send = (window as Window & { __gscE2eSendMidi?: (data: number[]) => void })
        .__gscE2eSendMidi;
      if (!send) {
        throw new Error("E2E MIDI mock is not installed");
      }
      send(data);
    },
    { data: bytes },
  );
  if (options.waitForDebounce !== false) {
    await page.waitForTimeout(DEFAULT_DEBOUNCE_WAIT_MS);
  }
}

export async function sendMidiNoteOn(
  page: Page,
  note: number,
  velocity = 127,
  channel = 1,
  options: SendMidiOptions = {},
): Promise<void> {
  const status = 0x90 + (channel - 1);
  await sendMidiBytes(page, [status, note, velocity], options);
}

export async function sendMidiNoteOff(
  page: Page,
  note: number,
  channel = 1,
  options: SendMidiOptions = {},
): Promise<void> {
  const status = 0x80 + (channel - 1);
  await sendMidiBytes(page, [status, note, 0], options);
}

export function settingsDialog(page: Page) {
  return page.getByRole("dialog", { name: "Settings" });
}

export async function openSettingsMidi(page: Page): Promise<void> {
  await pressModShortcut(page, ",");
  const dialog = settingsDialog(page);
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("navigation", { name: "Settings categories" })
    .getByRole("button", {
      name: "MIDI",
    })
    .click();
}

export async function setMidiDebounceMs(page: Page, ms: number): Promise<void> {
  const field = settingsDialog(page).locator("#midi-debounce-ms");
  await field.fill(String(ms));
  await field.blur();
}

export async function selectMidiInput(page: Page, label = E2E_MIDI_INPUT_NAME): Promise<void> {
  const dialog = settingsDialog(page);
  await dialog.locator("#midi-input-select").click();
  await page.getByRole("option", { name: label }).click();
  await expect
    .poll(async () =>
      page.evaluate(
        () => localStorage.getItem("gsc-preferences")?.includes("e2e-midi-in") ?? false,
      ),
    )
    .toBe(true);
}

/** Open MIDI settings and select the E2E mock input device. */
export async function configureMidiInput(page: Page): Promise<void> {
  await openSettingsMidi(page);
  await selectMidiInput(page);
}

export type MidiLearnAction =
  | "Next cue"
  | "Previous cue"
  | "GO (selected cue)"
  | "GO cue…"
  | "Panic";

export async function setMidiLearnAction(page: Page, action: MidiLearnAction): Promise<void> {
  const dialog = settingsDialog(page);
  const learnField = dialog.locator("span", { hasText: "Learn action" }).locator("..");
  await learnField.getByRole("combobox").click();
  await page.getByRole("option", { name: action, exact: true }).click();
}

export async function setMidiLearnCue(page: Page, cueOption: string): Promise<void> {
  const dialog = settingsDialog(page);
  const cueField = dialog.locator("span", { hasText: /^Cue$/ }).locator("..");
  await cueField.getByRole("combobox").click();
  await page.getByRole("option", { name: cueOption }).click();
}

export async function startMidiLearn(page: Page): Promise<void> {
  await settingsDialog(page).getByRole("button", { name: "Learn" }).click();
  await expect(
    settingsDialog(page).getByText("Press a control on your MIDI device…"),
  ).toBeVisible();
}

export async function learnMidiMapping(
  page: Page,
  options: { action: MidiLearnAction; note: number; expectedLabel?: string },
): Promise<void> {
  await setMidiLearnAction(page, options.action);
  await startMidiLearn(page);
  await sendMidiNoteOn(page, options.note);
  const label = options.expectedLabel ?? options.action;
  await expect(settingsDialog(page).getByText(`→ ${label}`).last()).toBeVisible();
}

export async function learnGoCueMapping(
  page: Page,
  options: { cueOption: string; note: number; expectedLabel: string },
): Promise<void> {
  await setMidiLearnAction(page, "GO cue…");
  await setMidiLearnCue(page, options.cueOption);
  await startMidiLearn(page);
  await sendMidiNoteOn(page, options.note);
  await expect(settingsDialog(page).getByText(`→ ${options.expectedLabel}`)).toBeVisible();
}

export async function autoMapNotesToCues(page: Page): Promise<void> {
  await settingsDialog(page).getByRole("button", { name: "Map notes → cues (from C2)" }).click();
  await expect(settingsDialog(page).getByText("→ GO")).toHaveCount(2);
}

export async function closeSettings(page: Page): Promise<void> {
  await settingsDialog(page).getByRole("button", { name: "Close" }).click();
  await expect(settingsDialog(page)).toHaveCount(0);
}

export async function selectSequenceCue(page: Page, displayName: string): Promise<void> {
  await selectSequenceCueRow(page, displayName);
}

/** Selected cue name is shown in the transport bar summary. */
export async function expectTransportShowsCue(page: Page, displayName: string): Promise<void> {
  await expect(page.getByRole("contentinfo").getByText(displayName, { exact: true })).toBeVisible();
}

export async function expectActiveCue(page: Page, displayName: string): Promise<void> {
  await openActiveCuesTab(page);
  await expect(activeCuesPanel(page).getByRole("button", { name: "Stop all" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(activeCueRow(page, displayName)).toBeVisible({ timeout: 15_000 });
}

export async function expectNoActiveCues(page: Page): Promise<void> {
  await openActiveCuesTab(page);
  await expect(activeCuesEmptyMessage(page)).toBeVisible();
}
