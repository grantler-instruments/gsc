/** Enttec DMX USB Pro serial protocol (57600 baud). */

export const ENTTEC_PRO_BAUD_RATE = 57600;

const DMX_PRO_HEADER_SIZE = 4;
const DMX_PRO_START_MSG = 0x7e;
const DMX_START_CODE = 0;
const DMX_START_CODE_SIZE = 1;
const DMX_PRO_SEND_PACKET = 0x06;
const DMX_PRO_SEND_PACKET2 = 0xa9;
const DMX_PRO_END_MSG = 0xe7;
const DMX_PRO_END_SIZE = 1;

/** Maximum DMX slots in one universe packet. */
export const ENTTEC_PRO_MAX_CHANNELS = 512;

export type EnttecProUniverse = 1 | 2;

export function enttecProPacketLabel(universe: number): number | null {
  if (universe === 1) return DMX_PRO_SEND_PACKET;
  if (universe === 2) return DMX_PRO_SEND_PACKET2;
  return null;
}

export function buildEnttecProPacket(universe: number, data: Uint8Array): Uint8Array | null {
  const label = enttecProPacketLabel(universe);
  if (label === null) return null;

  const channelCount = Math.min(data.length, ENTTEC_PRO_MAX_CHANNELS);
  const dataSize = channelCount + DMX_START_CODE_SIZE;
  const packetSize = DMX_PRO_HEADER_SIZE + dataSize + DMX_PRO_END_SIZE;
  const packet = new Uint8Array(packetSize);

  packet[0] = DMX_PRO_START_MSG;
  packet[1] = label;
  packet[2] = dataSize & 0xff;
  packet[3] = (dataSize >> 8) & 0xff;
  packet[4] = DMX_START_CODE;
  packet.set(data.subarray(0, channelCount), 5);
  packet[packetSize - 1] = DMX_PRO_END_MSG;

  return packet;
}
