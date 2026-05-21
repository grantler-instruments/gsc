import type { DeviceOption } from "../types/device";

export async function listMidiOutputDevices(): Promise<DeviceOption[]> {
  if (!navigator.requestMIDIAccess) return [];
  const access = await navigator.requestMIDIAccess({ sysex: false });
  const devices: DeviceOption[] = [];
  for (const output of access.outputs.values()) {
    devices.push({
      id: output.id,
      label: output.name?.trim() || output.id,
    });
  }
  return devices.sort((a, b) => a.label.localeCompare(b.label));
}
