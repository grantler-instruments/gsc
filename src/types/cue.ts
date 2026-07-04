export type CueType =
  | "audio"
  | "video"
  | "image"
  | "midi"
  | "osc"
  | "dmx"
  | "group"
  | "sequence"
  | "stop"
  | "wait"
  | "volumeFade"
  | "opacityFade"
  | "panFade"
  | "lightFade";

export type FadeCueType = "volumeFade" | "opacityFade" | "panFade" | "lightFade";

/** Media file cues (not MIDI/OSC). */
export type AssetKind = Exclude<
  CueType,
  | "midi"
  | "osc"
  | "dmx"
  | "group"
  | "sequence"
  | "stop"
  | "wait"
  | "volumeFade"
  | "opacityFade"
  | "panFade"
  | "lightFade"
>;

export type MidiMessageKind =
  | "note-on"
  | "note-off"
  | "control-change"
  | "program-change"
  | "pitch-bend"
  | "start"
  | "stop"
  | "continue";

export interface MidiCueData {
  channel: number;
  kind: MidiMessageKind;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
  program?: number;
  /** 14-bit pitch bend (0–16383; center = 8192). */
  pitchBend?: number;
}

export type OscArg =
  | { type: "int"; value: number }
  | { type: "float"; value: number }
  | { type: "string"; value: string }
  | { type: "bool"; value: boolean };

export interface OscCueData {
  host: string;
  port: number;
  address: string;
  args: OscArg[];
}

export interface DmxFixtureValues {
  fixtureId: string;
  /** 0–255 levels, one per fixture channel. */
  values: number[];
}

/** Partial = merge listed fixtures only. Snapshot = full rig state (unlisted at 0). */
export type DmxCueMode = "partial" | "snapshot";

export interface DmxCueData {
  mode: DmxCueMode;
  fixtures: DmxFixtureValues[];
}

import type { AudioBus } from "./audio-bus";
import type { Fixture } from "./fixture";
import type { FixturePlot } from "./fixture-plot";
import type { MidiMapping } from "./midi-mapping";
import type { VideoBus } from "./video-bus";
import type { VideoEffect } from "./video-effect";
import type { VideoOutputFrame } from "./video-output-frame";

export interface Cue {
  id: string;
  number: string;
  name: string;
  type: CueType;
  /** When set, cue is a child of a group/sequence container. */
  parentId?: string;
  assetPath?: string;
  midi?: MidiCueData;
  osc?: OscCueData;
  dmx?: DmxCueData;
  /** Seconds into the source media where playback begins (In point). */
  inTime?: number;
  /** Seconds into the source media where playback stops (Out point). Omit to play to end. */
  outTime?: number;
  fadeIn?: number;
  fadeOut?: number;
  /** Repeat the in/out region (audio/video). */
  loop?: boolean;
  /** When loop is true and set: how many times to play (minimum 2). Omit for infinite. */
  loopCount?: number;
  volume?: number;
  /** -1 (full left) to 1 (full right) for audio/video cues. */
  pan?: number;
  /** Internal mix bus; unset routes direct to master. */
  audioBusId?: string;
  /** Visual output bus; unset routes to the master output window. */
  videoBusId?: string;
  /** 1-based device output channels for audio routing; defaults to [1, 2]. */
  outputChannels?: number[];
  /** 0–1 for image/video cues. */
  opacity?: number;
  /** For volume/opacity fade cues: cue to fade when triggered. */
  fadeTargetId?: string;
  /** Fade length in seconds. */
  fadeDuration?: number;
  /** Start level for fade cues (0–1). */
  fadeFrom?: number;
  /** End level for fade cues (0–1). */
  fadeTo?: number;
  /** Production / operator notes for this cue. */
  notes?: string;
  /** Shown in the top-right when this cue is selected. */
  triggerNote?: string;
  /** For stop cues: id of the cue to stop when this cue is triggered. */
  stopTargetId?: string;
  /** For wait cues: how long to hold before the next sequence step (seconds). */
  waitDurationSec?: number;
}

export interface CueListSnapshot {
  id: string;
  name: string;
  cues: Cue[];
}

export interface ProjectSnapshot {
  version: 2;
  /** Stable project identity; assigned on creation, preserved across save/load. */
  id: string;
  name: string;
  /** Optional show start date (ISO 8601 calendar date, YYYY-MM-DD). */
  startDate?: string;
  /** Optional show end date (ISO 8601 calendar date, YYYY-MM-DD). */
  endDate?: string;
  /** @deprecated Legacy single date field; read for backward compatibility only. */
  date?: string;
  /** Optional show description or notes. */
  description?: string;
  cueLists: CueListSnapshot[];
  activeCueListId: string;
  /** MIDI input → action bindings for this show. */
  midiMappings?: MidiMapping[];
  /** Patched DMX fixtures for this show. */
  fixtures?: Fixture[];
  /** Spatial layout for the fixture plot visualizer. */
  fixturePlot?: FixturePlot;
  /** Internal audio mix buses; empty means flat routing to master. */
  audioBuses?: AudioBus[];
  /** Visual output buses; empty means all visuals go to the master output window. */
  videoBuses?: VideoBus[];
  /** Display name for the main output window; defaults to "Main". */
  masterVideoOutputName?: string;
  /** 0–1 master dimmer on the main output window. */
  masterVideoOutputOpacity?: number;
  /** Insert effects on the main output window. */
  masterVideoOutputEffects?: VideoEffect[];
  /** Crop and placement on the main output window. */
  masterVideoOutputFrame?: VideoOutputFrame;
}
