export type CueType =
  | "audio"
  | "video"
  | "image"
  | "midi"
  | "group"
  | "sequence"
  | "stop"
  | "volumeFade"
  | "opacityFade";

export type FadeCueType = "volumeFade" | "opacityFade";

/** Media file cues (not MIDI). */
export type AssetKind = Exclude<
  CueType,
  "midi" | "group" | "sequence" | "stop" | "volumeFade" | "opacityFade"
>;

export type MidiMessageKind =
  | "note-on"
  | "note-off"
  | "control-change"
  | "program-change";

export interface MidiCueData {
  channel: number;
  kind: MidiMessageKind;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
  program?: number;
}

export interface Cue {
  id: string;
  number: string;
  name: string;
  type: CueType;
  /** When set, cue is a child of a group/sequence container. */
  parentId?: string;
  assetPath?: string;
  midi?: MidiCueData;
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
  /** @deprecated Use loopCount undefined for infinite. */
  loopInfinite?: boolean;
  volume?: number;
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
  /** For stop cues: id of the cue to stop when this cue is triggered. */
  stopTargetId?: string;
}

export interface CueListSnapshot {
  id: string;
  name: string;
  cues: Cue[];
}

/** @deprecated Use ProjectSnapshotV2 */
export interface ProjectSnapshotV1 {
  version: 1;
  name: string;
  cues: Cue[];
}

export interface ProjectSnapshotV2 {
  version: 2;
  name: string;
  cueLists: CueListSnapshot[];
  activeCueListId: string;
}

export type ProjectSnapshot = ProjectSnapshotV1 | ProjectSnapshotV2;
