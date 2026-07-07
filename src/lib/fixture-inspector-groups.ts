import type {
  Fixture,
  FixtureChannelCapability,
  FixtureChannelKind,
  FixtureOflChannel,
} from "../types/fixture";
import { fixtureChannelLabel } from "./dmx";
import { isFineChannel } from "./fixture-definition";

export type FixtureInspectorGroupId =
  | "intensity"
  | "color"
  | "position"
  | "wheels"
  | "beam"
  | "other";

export interface FixtureInspectorPreset {
  label: string;
  dmxValue: number;
  dmxRange: [number, number];
}

export interface FixtureInspectorChannel {
  channelIndex: number;
  fineChannelIndex?: number;
  label: string;
  kind: FixtureChannelKind;
  presets?: FixtureInspectorPreset[];
  resolution: "8bit" | "16bit";
}

export interface FixtureInspectorGroup {
  id: FixtureInspectorGroupId;
  channels: FixtureInspectorChannel[];
}

export const FIXTURE_INSPECTOR_GROUP_ORDER: FixtureInspectorGroupId[] = [
  "intensity",
  "color",
  "position",
  "wheels",
  "beam",
  "other",
];

const KIND_TO_GROUP: Record<FixtureChannelKind, FixtureInspectorGroupId> = {
  intensity: "intensity",
  red: "color",
  green: "color",
  blue: "color",
  white: "color",
  amber: "color",
  uv: "color",
  lime: "color",
  warmWhite: "color",
  coldWhite: "color",
  cyan: "color",
  magenta: "color",
  yellow: "color",
  pan: "position",
  tilt: "position",
  panTiltSpeed: "position",
  colorWheel: "wheels",
  gobo: "wheels",
  goboRotation: "wheels",
  prism: "wheels",
  shutter: "beam",
  focus: "beam",
  zoom: "beam",
  iris: "beam",
  colorTemperature: "beam",
  effect: "other",
  maintenance: "other",
  noFunction: "other",
  unused: "other",
  generic: "other",
};

export function combineCoarseFineDmx(coarse: number, fine: number): number {
  const clampedCoarse = Math.max(0, Math.min(255, Math.round(coarse)));
  const clampedFine = Math.max(0, Math.min(255, Math.round(fine)));
  return (clampedCoarse << 8) | clampedFine;
}

export function splitCoarseFineDmx(combined: number): { coarse: number; fine: number } {
  const clamped = Math.max(0, Math.min(65535, Math.round(combined)));
  return { coarse: (clamped >> 8) & 0xff, fine: clamped & 0xff };
}

function presetLabel(cap: FixtureChannelCapability): string {
  if (cap.label?.trim()) return cap.label.trim();
  if (cap.slotNumber !== undefined) return `Slot ${cap.slotNumber}`;
  return `DMX ${cap.dmxRange[0]}–${cap.dmxRange[1]}`;
}

function buildPresets(channel: FixtureOflChannel): FixtureInspectorPreset[] | undefined {
  if (!channel.capabilities?.length) return undefined;

  const presets = channel.capabilities.map((cap) => ({
    label: presetLabel(cap),
    dmxValue: cap.dmxRange[0],
    dmxRange: cap.dmxRange,
  }));

  return presets.length > 0 ? presets : undefined;
}

export function findPresetForValue(
  value: number,
  presets: FixtureInspectorPreset[] | undefined,
): FixtureInspectorPreset | undefined {
  if (!presets) return undefined;
  return presets.find((preset) => value >= preset.dmxRange[0] && value <= preset.dmxRange[1]);
}

function channelLabel(fixture: Fixture, channelIndex: number, channel: FixtureOflChannel): string {
  return fixtureChannelLabel(fixture, channelIndex) ?? channel.key ?? `Ch ${channelIndex + 1}`;
}

function buildOflInspectorChannel(
  fixture: Fixture,
  channelIndex: number,
  channel: FixtureOflChannel,
): FixtureInspectorChannel | null {
  if (channel.kind === "unused") return null;
  if (isFineChannel(fixture.ofl, channelIndex)) return null;

  const presets = buildPresets(channel);
  const fineChannelIndex = channel.fineIndex;

  return {
    channelIndex,
    fineChannelIndex,
    label: channelLabel(fixture, channelIndex, channel),
    kind: channel.kind,
    presets,
    resolution: fineChannelIndex !== undefined ? "16bit" : "8bit",
  };
}

function buildManualInspectorChannel(
  fixture: Fixture,
  channelIndex: number,
): FixtureInspectorChannel {
  return {
    channelIndex,
    label: fixtureChannelLabel(fixture, channelIndex) ?? `Ch ${channelIndex + 1}`,
    kind: "generic",
    resolution: "8bit",
  };
}

export function groupFixtureInspectorChannels(fixture: Fixture): FixtureInspectorGroup[] {
  const grouped = new Map<FixtureInspectorGroupId, FixtureInspectorChannel[]>();

  const addChannel = (groupId: FixtureInspectorGroupId, channel: FixtureInspectorChannel) => {
    const list = grouped.get(groupId) ?? [];
    list.push(channel);
    grouped.set(groupId, list);
  };

  if (!fixture.ofl?.channels.length) {
    for (let index = 0; index < fixture.channelCount; index += 1) {
      addChannel("other", buildManualInspectorChannel(fixture, index));
    }
  } else {
    for (let index = 0; index < fixture.ofl.channels.length; index += 1) {
      const channel = fixture.ofl.channels[index];
      if (!channel) continue;
      const row = buildOflInspectorChannel(fixture, index, channel);
      if (!row) continue;
      addChannel(KIND_TO_GROUP[channel.kind] ?? "other", row);
    }
  }

  return FIXTURE_INSPECTOR_GROUP_ORDER.flatMap((id) => {
    const channels = grouped.get(id);
    return channels?.length ? [{ id, channels }] : [];
  });
}
