import { getWebMidiAccess, resolveWebMidiOutput } from "./web-midi";

export async function sendMidiMessage(
  portId: string | null,
  message: number[],
): Promise<void> {
  const access = await getWebMidiAccess();
  if (!access) {
    console.warn("[midi] Web MIDI is not available in this browser");
    return;
  }
  const output = resolveWebMidiOutput(access, portId);
  if (!output) {
    console.warn("[midi] No MIDI output device available");
    return;
  }
  output.send(message);
}
