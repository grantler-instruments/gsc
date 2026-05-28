import { describe, expect, it } from "vitest";
import { buildEnttecProPacket } from "./enttec-pro";

describe("enttec-pro", () => {
  it("builds a universe 1 packet with start code and terminator", () => {
    const packet = buildEnttecProPacket(1, new Uint8Array([255, 128]));
    expect(packet).not.toBeNull();
    expect(packet?.length).toBe(4 + 3 + 1);
    expect(packet?.[0]).toBe(0x7e);
    expect(packet?.[1]).toBe(0x06);
    expect(packet?.[2]).toBe(3);
    expect(packet?.[3]).toBe(0);
    expect(packet?.[4]).toBe(0);
    expect(packet?.[5]).toBe(255);
    expect(packet?.[6]).toBe(128);
    expect(packet?.[packet?.length - 1]).toBe(0xe7);
  });

  it("builds a universe 2 packet for MK2 devices", () => {
    const packet = buildEnttecProPacket(2, new Uint8Array([10]));
    expect(packet).not.toBeNull();
    expect(packet?.[1]).toBe(0xa9);
  });

  it("rejects unsupported universes", () => {
    expect(buildEnttecProPacket(3, new Uint8Array([1]))).toBeNull();
  });
});
