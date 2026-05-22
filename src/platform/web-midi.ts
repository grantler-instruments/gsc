import type { DeviceOption } from "../types/device";

let accessPromise: Promise<MIDIAccess | null> | null = null;

/** Shared Web MIDI access — one permission prompt for the whole app. */
export async function getWebMidiAccess(): Promise<MIDIAccess | null> {
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

export function resolveWebMidiOutput(
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

export function resolveWebMidiInput(
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

function portOptions(ports: Iterable<MIDIPort>): DeviceOption[] {
  const devices: DeviceOption[] = [];
  for (const port of ports) {
    devices.push({
      id: port.id,
      label: port.name?.trim() || port.id,
    });
  }
  return devices.sort((a, b) => a.label.localeCompare(b.label));
}

export async function listWebMidiOutputDevices(): Promise<DeviceOption[]> {
  const access = await getWebMidiAccess();
  if (!access) return [];
  return portOptions(access.outputs.values());
}

export async function listWebMidiInputDevices(): Promise<DeviceOption[]> {
  const access = await getWebMidiAccess();
  if (!access) return [];
  return portOptions(access.inputs.values());
}
