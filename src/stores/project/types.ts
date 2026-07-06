import type { CueList } from "../../lib/cue-lists";
import type { AudioBus } from "../../types/audio-bus";
import type {
  AudioEffect,
  AudioEffectType,
  DelayEffectParams,
  EqEffectParams,
  ReverbEffectParams,
} from "../../types/audio-effect";
import type {
  Cue,
  CueType,
  DmxCueData,
  FadeCueType,
  MidiCueData,
  OscCueData,
  ProjectSnapshot,
} from "../../types/cue";
import type { Fixture } from "../../types/fixture";
import type { FixturePlot, FixturePlotEntry } from "../../types/fixture-plot";
import type { MidiMapping } from "../../types/midi-mapping";
import type { VideoBus } from "../../types/video-bus";
import type { VideoEffect, VideoEffectParams, VideoEffectType } from "../../types/video-effect";
import type { VideoOutputFrame } from "../../types/video-output-frame";

export interface ProjectState {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  cueLists: CueList[];
  activeCueListId: string;
  midiMappings: MidiMapping[];
  fixtures: Fixture[];
  fixturePlot: FixturePlot;
  audioBuses: AudioBus[];
  videoBuses: VideoBus[];
  masterVideoOutputName: string;
  masterVideoOutputOpacity: number;
  masterVideoOutputEffects?: VideoEffect[];
  masterVideoOutputFrame?: VideoOutputFrame;
  addCue: (opts: {
    name: string;
    type: CueType;
    assetPath?: string;
    midi?: MidiCueData;
    osc?: OscCueData;
    dmx?: DmxCueData;
    parentId?: string;
  }) => Cue;
  addCues: (
    items: Array<{
      name: string;
      type: CueType;
      assetPath?: string;
      midi?: MidiCueData;
      osc?: OscCueData;
      dmx?: DmxCueData;
      parentId?: string;
    }>,
  ) => Cue[];
  addGroupCue: (opts?: { name?: string; parentId?: string }) => Cue;
  addSequenceCue: (opts?: { name?: string; parentId?: string }) => Cue;
  addStopCueForTarget: (targetId: string) => Cue | null;
  addFadeCue: (fadeType: FadeCueType) => Cue;
  addFadeCueForTarget: (targetId: string, fadeType: FadeCueType) => Cue | null;
  updateCue: (id: string, patch: Partial<Cue>) => void;
  removeCue: (id: string) => void;
  /** Remove every cue across all lists that references the given asset path. */
  removeCuesUsingAsset: (assetPath: string) => void;
  moveCueToGroup: (cueId: string, groupId: string | null) => void;
  reparentCueRelative: (draggedId: string, targetId: string, place: "before" | "after") => void;
  reparentCueToListEnd: (draggedId: string) => void;
  addSelectedCueToGroup: (groupId: string) => void;
  reorderCueRelative: (draggedId: string, targetId: string, place: "before" | "after") => void;
  selectCue: (id: string | null) => void;
  toggleSelectCue: (id: string) => void;
  selectCueRange: (id: string, visibleOrder: string[]) => void;
  groupSelectedCues: () => Cue | null;
  ungroupCue: (cueId: string) => string[] | null;
  copySelectedCues: () => boolean;
  cutSelectedCues: () => boolean;
  pasteSelectedCues: () => boolean;
  duplicateSelectedCues: () => boolean;
  addCueList: (name?: string) => CueList;
  removeCueList: (listId: string) => void;
  renameCueList: (listId: string, name: string) => void;
  reorderCueListRelative: (draggedId: string, targetId: string, place: "before" | "after") => void;
  copyCueList: (listId: string) => void;
  cutCueList: (listId: string) => void;
  pasteCueList: (afterListId?: string) => void;
  duplicateCueList: (listId: string) => void;
  setActiveCueList: (listId: string) => void;
  setShowMetadata: (metadata: {
    name: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }) => void;
  addMidiMapping: (mapping: Omit<MidiMapping, "id">) => MidiMapping;
  removeMidiMapping: (id: string) => void;
  updateMidiMapping: (id: string, patch: Partial<MidiMapping>) => void;
  setMidiMappings: (mappings: MidiMapping[]) => void;
  autoMapNotesToCues: (startNote?: number) => void;
  addFixture: (opts?: Partial<Omit<Fixture, "id">>) => Fixture;
  removeFixture: (id: string) => void;
  updateFixture: (id: string, patch: Partial<Omit<Fixture, "id">>) => void;
  appendFixtures: (fixtures: Fixture[]) => void;
  addAudioBus: (opts?: Partial<Omit<AudioBus, "id">>) => AudioBus;
  removeAudioBus: (id: string) => void;
  updateAudioBus: (id: string, patch: Partial<Omit<AudioBus, "id">>) => void;
  addBusEffect: (busId: string, type: AudioEffectType) => AudioEffect | null;
  updateBusEffect: (
    busId: string,
    effectId: string,
    patch: Partial<Omit<AudioEffect, "id" | "params" | "type">> & {
      params?: Partial<EqEffectParams & DelayEffectParams & ReverbEffectParams>;
    },
  ) => void;
  removeBusEffect: (busId: string, effectId: string) => void;
  reorderBusEffectRelative: (
    busId: string,
    draggedId: string,
    targetId: string,
    place: "before" | "after",
  ) => void;
  addVideoBus: (opts?: Partial<Omit<VideoBus, "id">>) => VideoBus;
  removeVideoBus: (id: string) => void;
  updateVideoBus: (id: string, patch: Partial<Omit<VideoBus, "id">>) => void;
  addVideoBusEffect: (busId: string, type: VideoEffectType) => VideoEffect | null;
  updateVideoBusEffect: (
    busId: string,
    effectId: string,
    patch: Partial<Omit<VideoEffect, "id" | "params" | "type">> & {
      params?: Partial<VideoEffectParams>;
    },
  ) => void;
  removeVideoBusEffect: (busId: string, effectId: string) => void;
  reorderVideoBusEffectRelative: (
    busId: string,
    draggedId: string,
    targetId: string,
    place: "before" | "after",
  ) => void;
  updateMasterVideoOutputName: (name: string) => void;
  updateMasterVideoOutputOpacity: (opacity: number) => void;
  updateMasterVideoOutputFrame: (frame: VideoOutputFrame) => void;
  addMasterVideoOutputEffect: (type: VideoEffectType) => VideoEffect | null;
  updateMasterVideoOutputEffect: (
    effectId: string,
    patch: Partial<Omit<VideoEffect, "id" | "params" | "type">> & {
      params?: Partial<VideoEffectParams>;
    },
  ) => void;
  removeMasterVideoOutputEffect: (effectId: string) => void;
  reorderMasterVideoOutputEffectRelative: (
    draggedId: string,
    targetId: string,
    place: "before" | "after",
  ) => void;
  syncFixturePlot: () => void;
  setFixturePlot: (plot: FixturePlot) => void;
  updateFixturePlotEntry: (
    fixtureId: string,
    patch: Partial<Omit<FixturePlotEntry, "fixtureId">>,
  ) => void;
  moveFixturePlotEntry: (fixtureId: string, x: number, y: number) => void;
  loadSnapshot: (snap: ProjectSnapshot) => void;
  getSnapshot: () => ProjectSnapshot;
}
