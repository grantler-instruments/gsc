import type {
  Fixture,
  FixtureChannel,
  FixtureChannelResolution,
  FixtureOflChannel,
} from "../types/fixture";

export const DMX_VALUE_16BIT_MAX = 65535;

export interface FixtureChannelMeta {
  name?: string;
  resolution?: FixtureChannelResolution;
}

export interface FixtureLogicalChannel {
  /** Physical slot index (coarse for 16-bit pairs). */
  slotIndex: number;
  is16Bit: boolean;
  name?: string;
}

export function isOflFineChannelKey(key: string): boolean {
  return /\bfine$/i.test(key.trim());
}

export function isOflFineChannelFor(coarseKey: string, fineKey: string): boolean {
  if (!isOflFineChannelKey(fineKey)) return false;
  const coarse = coarseKey.trim().toLowerCase();
  const fine = fineKey.trim().toLowerCase();
  return fine === `${coarse} fine` || fine.endsWith(` ${coarse} fine`);
}

export function applyOflChannelResolutions(channels: FixtureOflChannel[]): FixtureOflChannel[] {
  return channels.map((channel, index) => {
    if (channel.resolution) return channel;
    if (isOflFineChannelKey(channel.key)) {
      return { ...channel, resolution: "fine" };
    }
    const next = channels[index + 1];
    if (next && isOflFineChannelFor(channel.key, next.key)) {
      return { ...channel, resolution: "16bit" };
    }
    return channel;
  });
}

export function normalizeFixtureChannel(channel: FixtureChannel | undefined): FixtureChannel {
  if (!channel) return {};
  const resolution =
    channel.resolution === "fine" || channel.resolution === "16bit"
      ? channel.resolution
      : undefined;
  return {
    name: channel.name?.trim() || undefined,
    resolution,
  };
}

/** Ensure each 16-bit coarse channel is followed by a fine slot. */
export function repairFixtureChannelPairs(channels: FixtureChannel[]): FixtureChannel[] {
  const result: FixtureChannel[] = [];

  for (let index = 0; index < channels.length; index += 1) {
    const channel = normalizeFixtureChannel(channels[index]);

    if (channel.resolution === "fine") {
      result.push({ name: channel.name });
      continue;
    }

    if (channel.resolution === "16bit") {
      result.push(channel);
      const next = channels[index + 1];
      if (next?.resolution === "fine") {
        result.push({ resolution: "fine" });
        index += 1;
      } else {
        result.push({ resolution: "fine" });
      }
      continue;
    }

    result.push(channel);
  }

  return result;
}

export function isFineChannelSlot(fixture: Fixture, slotIndex: number): boolean {
  return getFixtureChannelMeta(fixture, slotIndex).resolution === "fine";
}

export function is16BitCoarseSlot(fixture: Fixture, slotIndex: number): boolean {
  return getFixtureChannelMeta(fixture, slotIndex).resolution === "16bit";
}

export function getFixtureChannelMeta(fixture: Fixture, slotIndex: number): FixtureChannelMeta {
  if (fixture.ofl) {
    const channel = fixture.ofl.channels[slotIndex];
    if (!channel) return {};
    return { name: channel.key, resolution: channel.resolution };
  }

  const channel = fixture.channels?.[slotIndex];
  if (!channel) return {};
  return { name: channel.name, resolution: channel.resolution };
}

export function iterateFixtureLogicalChannels(fixture: Fixture): FixtureLogicalChannel[] {
  const logical: FixtureLogicalChannel[] = [];

  for (let slotIndex = 0; slotIndex < fixture.channelCount; slotIndex += 1) {
    const meta = getFixtureChannelMeta(fixture, slotIndex);
    if (meta.resolution === "fine") continue;

    logical.push({
      slotIndex,
      is16Bit: meta.resolution === "16bit",
      name: meta.name,
    });
  }

  return logical;
}

export function clampDmx16BitValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(DMX_VALUE_16BIT_MAX, Math.round(value)));
}

export function split16BitValue(value: number): { coarse: number; fine: number } {
  const clamped = clampDmx16BitValue(value);
  return {
    coarse: Math.floor(clamped / 256),
    fine: clamped % 256,
  };
}

export function combine16BitValue(coarse: number, fine: number): number {
  return clampDmx16BitValue(coarse * 256 + fine);
}

export function getDmxFixtureLogicalChannelValue(
  values: number[],
  fixture: Fixture,
  slotIndex: number,
): number {
  if (is16BitCoarseSlot(fixture, slotIndex)) {
    return combine16BitValue(values[slotIndex] ?? 0, values[slotIndex + 1] ?? 0);
  }
  return values[slotIndex] ?? 0;
}
