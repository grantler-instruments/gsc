import { buildDeemexMidiMessages, deemexMaxDmxChannels } from "../lib/deemex-midi";
import type { DmxUniverseFrame } from "../lib/dmx";
import { usePreferencesStore } from "../stores/preferences";
import { sendMidiMessage } from "./send-midi";

const lastSentByChannel = new Int16Array(512).fill(-1);
let cachedStartChannel = -1;

export function resetDeemexMidiOutputCache(): void {
  lastSentByChannel.fill(-1);
  cachedStartChannel = -1;
}

export async function sendDeemexMidiUniverses(frames: DmxUniverseFrame[]): Promise<void> {
  if (frames.length === 0) return;

  const prefs = usePreferencesStore.getState();
  const portId = prefs.deemexMidiPortId;
  if (!portId) return;

  const startChannel = prefs.deemexMidiStartChannel;
  if (cachedStartChannel !== startChannel) {
    resetDeemexMidiOutputCache();
    cachedStartChannel = startChannel;
  }

  const maxChannels = deemexMaxDmxChannels(startChannel);

  for (const frame of frames) {
    if (frame.universe !== 1) continue;

    for (let index = 0; index < Math.min(frame.data.length, maxChannels); index += 1) {
      const value = frame.data[index] ?? 0;
      if (lastSentByChannel[index] === value) continue;
      lastSentByChannel[index] = value;

      const messages = buildDeemexMidiMessages(index + 1, value, startChannel);
      for (const message of messages) {
        await sendMidiMessage(portId, message);
      }
    }
  }
}
