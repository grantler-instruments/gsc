/** QLab cue type strings as stored in workspace archives / OSC. */
export type QLabCueType =
  | "Audio"
  | "Video"
  | "Camera"
  | "Group"
  | "Sequence"
  | "Wait"
  | "Stop"
  | "Fade"
  | "MIDI"
  | "Network"
  | "Light"
  | "Memo"
  | "Text"
  | "Script"
  | "Timecode"
  | "Mic"
  | "Start"
  | "Pause"
  | "Load"
  | "Reset"
  | "Target"
  | "Arm"
  | "Disarm"
  | "Devamp"
  | "CueList"
  | "Cart"
  | string;

export type QLabContinueMode = "do_not_continue" | "auto_continue" | "auto_follow" | string;

export type QLabGroupMode = "start_all" | "timeline" | string;

export interface QLabFileTarget {
  /** Absolute or relative path from QLab workspace. */
  path: string;
}

export interface QLabMidiData {
  messageType: string;
  channel: number;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
  program?: number;
}

export interface QLabOscData {
  host: string;
  port: number;
  address: string;
  args: Array<{ type: string; value: string | number | boolean }>;
}

export interface QLabCue {
  uniqueId: string;
  number: string;
  name: string;
  type: QLabCueType;
  armed: boolean;
  flagged: boolean;
  notes: string;
  continueMode: QLabContinueMode;
  preWaitSec: number;
  postWaitSec: number;
  durationSec: number;
  fileTarget: QLabFileTarget | null;
  targetUniqueId: string | null;
  groupMode: QLabGroupMode | null;
  volume: number;
  pan: number;
  opacity: number;
  fadeInSec: number;
  fadeOutSec: number;
  inTimeSec: number;
  outTimeSec: number;
  loop: boolean;
  midi: QLabMidiData | null;
  osc: QLabOscData | null;
  children: QLabCue[];
  /** Parsed fade target level (0–1) for Fade cues. */
  fadeTo: number | null;
  /** Parsed fade start level for Fade cues when explicitly set. */
  fadeFrom: number | null;
  /** QLab "stop target when done" on Fade cues. */
  stopTargetWhenDone: boolean;
  /** True when the fade adjusts opacity instead of volume. */
  fadeOpacity: boolean;
}

export interface QLabCueList {
  uniqueId: string;
  name: string;
  isCart: boolean;
  cues: QLabCue[];
}

export interface QLabWorkspace {
  name: string;
  uniqueId: string;
  currentCueListId: string | null;
  cueLists: QLabCueList[];
  /** Raw archive version string when present. */
  archiveVersion: string | null;
}

export const QLAB5_WORKSPACE_EXTENSION = ".qlab5";

export const QLAB_MEDIA_SUBDIRS = ["audio", "video", "midi", "samples"] as const;
