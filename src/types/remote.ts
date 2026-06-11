import type { CuePlaybackProgress } from "../stores/playback";
import type { RunningSequence } from "../stores/transport";
import type { ProjectSnapshot } from "./cue";

export interface RemoteTransportState {
  isPlaying: boolean;
  activeCueId: string | null;
  activeCueIds: string[];
  cueStartedAtMs: Record<string, number>;
  runningSequences: Record<string, RunningSequence>;
  masterVolume: number;
}

export interface RemoteSnapshot {
  project: ProjectSnapshot;
  selectedCueIds: string[];
  selectionAnchorId: string | null;
  transport: RemoteTransportState;
  playback: Record<string, CuePlaybackProgress>;
  /** Light-cue DMX preview toggles (host → remote). */
  dmxPreviewCueIds: string[];
  /** Fixture plot expanded above the cue list on the host. */
  fixturePlotExpanded: boolean;
  /** Current DMX levels per fixture for the fixture plot (host output buffers). */
  fixtureChannelValues: Record<string, number[]>;
}

export type RemoteServerMessage =
  | { type: "authOk" }
  | { type: "authFail"; reason?: string }
  | { type: "snapshot"; payload: RemoteSnapshot }
  | { type: string; payload?: unknown; reason?: string };

export type RemoteCommandAction =
  | { action: "go-selected" }
  | { action: "go"; cueId: string }
  | { action: "hot-go"; cueId: string }
  | { action: "select-cue"; cueId: string }
  | { action: "panic" }
  | { action: "set-master-volume"; value: number }
  | { action: "set-active-cue-list"; cueListId: string };

export interface RemoteServerInfo {
  port: number;
  pin: string;
  lanIp: string;
  connectUrl: string;
  devMode: boolean;
}

export interface RemoteServerStatus {
  running: boolean;
  port: number;
  pin: string;
  lanIp: string;
  connectUrl: string;
  clientCount: number;
  devMode: boolean;
}

export type RemoteHostCommand =
  | { action: "go-selected" }
  | { action: "go"; cue_id: string }
  | { action: "hot-go"; cue_id: string }
  | { action: "select-cue"; cue_id: string }
  | { action: "panic" }
  | { action: "set-master-volume"; value: number }
  | { action: "set-active-cue-list"; cue_list_id: string };
