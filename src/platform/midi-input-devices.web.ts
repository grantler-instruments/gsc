import type { DeviceOption } from "../types/device";

export async function listMidiInputDevices(): Promise<DeviceOption[]> {
  if (!navigator.requestMIDIAccess) return [];
  const access = await navigator.requestMIDIAccess({ sysex: false });
  const devices: DeviceOption[] = [];
  for (const input of access.inputs.values()) {
    devices.push({
      id: input.id,
      label: input.name?.trim() || input.id,
    });
  }
  return devices.sort((a, b) => a.label.localeCompare(b.label));
}
