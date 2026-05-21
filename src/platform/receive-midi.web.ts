import type { MidiMessageHandler } from "./receive-midi";

let accessPromise: Promise<MIDIAccess | null> | null = null;

async function getMidiAccess(): Promise<MIDIAccess | null> {
  if (!navigator.requestMIDIAccess) return null;
  accessPromise ??= navigator
    .requestMIDIAccess({ sysex: false })
    .then((access) => access)
    .catch((err) => {
      console.warn("[midi] Could not access Web MIDI", err);
      accessPromise = null;
      return null;
    });
  return accessPromise;
}

function resolveInput(
  access: MIDIAccess,
  portId: string | null,
): MIDIInput | undefined {
  if (portId) {
    const port = access.inputs.get(portId);
    if (port) return port;
    console.warn(`[midi] Input "${portId}" not found`);
  }
  const first = access.inputs.values().next().value;
  if (!portId && first) {
    console.warn("[midi] No MIDI input selected — using first available device");
  }
  return first;
}

export async function openMidiInput(
  portId: string | null,
  onMessage: MidiMessageHandler,
): Promise<() => void> {
  const access = await getMidiAccess();
  if (!access) {
    console.warn("[midi] Web MIDI is not available in this browser");
    return () => {};
  }

  const input = resolveInput(access, portId);
  if (!input) {
    console.warn("[midi] No MIDI input device available");
    return () => {};
  }

  const handler = (e: MIDIMessageEvent) => {
    if (!e.data?.length) return;
    onMessage([...e.data]);
  };

  input.addEventListener("midimessage", handler);
  return () => input.removeEventListener("midimessage", handler);
}
