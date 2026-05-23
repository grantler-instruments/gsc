import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { notifyErrorFromUnknown } from "../lib/notifications";
import type { MidiMessageHandler } from "./receive-midi";

export async function openMidiInput(
  portId: string | null,
  onMessage: MidiMessageHandler,
): Promise<() => void> {
  if (!portId) {
    return () => {};
  }

  let unlisten: UnlistenFn | null = null;
  try {
    unlisten = await listen<number[]>("midi://message", (event) => {
      if (Array.isArray(event.payload) && event.payload.length > 0) {
        onMessage(event.payload);
      }
    });
    await invoke("start_midi_input", { portId });
  } catch (err) {
    notifyErrorFromUnknown(err);
    if (unlisten) {
      await unlisten();
    }
    return () => {};
  }

  return () => {
    void invoke("stop_midi_input").catch(() => {});
    if (unlisten) {
      void unlisten();
      unlisten = null;
    }
  };
}
