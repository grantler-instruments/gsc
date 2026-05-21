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

function resolveOutput(
  access: MIDIAccess,
  portId: string | null,
): MIDIOutput | undefined {
  if (portId) {
    const port = access.outputs.get(portId);
    if (port) return port;
    console.warn(`[midi] Output "${portId}" not found`);
  }
  const first = access.outputs.values().next().value;
  if (!portId && first) {
    console.warn("[midi] No MIDI output selected — using first available device");
  }
  return first;
}

export async function sendMidiMessage(
  portId: string | null,
  message: number[],
): Promise<void> {
  const access = await getMidiAccess();
  if (!access) {
    console.warn("[midi] Web MIDI is not available in this browser");
    return;
  }
  const output = resolveOutput(access, portId);
  if (!output) {
    console.warn("[midi] No MIDI output device available");
    return;
  }
  output.send(message);
}
