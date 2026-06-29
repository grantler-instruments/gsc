import type { DeviceOption } from "./device";

export interface AudioOutputDeviceOption extends DeviceOption {
  channelCount: number;
}
