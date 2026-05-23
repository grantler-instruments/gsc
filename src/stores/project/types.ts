import type { CueList } from "../../lib/cue-lists";
import type {
  Cue,
  CueType,
  FadeCueType,
  MidiCueData,
  OscCueData,
  DmxCueData,
  ProjectSnapshot,
} from "../../types/cue";
import type { Fixture } from "../../types/fixture";
import type { MidiMapping } from "../../types/midi-mapping";

export interface ProjectState {
  id: string;
  name: string;
  cueLists: CueList[];
  activeCueListId: string;
  midiMappings: MidiMapping[];
  fixtures: Fixture[];
  addCue: (opts: {
    name: string;
    type: CueType;
    assetPath?: string;
    midi?: MidiCueData;
    osc?: OscCueData;
    dmx?: DmxCueData;
    parentId?: string;
  }) => Cue;
  addGroupCue: (opts?: { name?: string; parentId?: string }) => Cue;
  addSequenceCue: (opts?: { name?: string; parentId?: string }) => Cue;
  addStopCueForTarget: (targetId: string) => Cue | null;
  addFadeCue: (fadeType: FadeCueType) => Cue;
  addFadeCueForTarget: (
    targetId: string,
    fadeType: FadeCueType,
  ) => Cue | null;
  updateCue: (id: string, patch: Partial<Cue>) => void;
  removeCue: (id: string) => void;
  moveCueToGroup: (cueId: string, groupId: string | null) => void;
  addSelectedCueToGroup: (groupId: string) => void;
  reorderCueRelative: (
    draggedId: string,
    targetId: string,
    place: "before" | "after",
  ) => void;
  selectCue: (id: string | null) => void;
  toggleSelectCue: (id: string) => void;
  selectCueRange: (id: string, visibleOrder: string[]) => void;
  groupSelectedCues: () => Cue | null;
  copySelectedCues: () => boolean;
  pasteSelectedCues: () => boolean;
  duplicateSelectedCues: () => boolean;
  addCueList: (name?: string) => CueList;
  removeCueList: (listId: string) => void;
  renameCueList: (listId: string, name: string) => void;
  setActiveCueList: (listId: string) => void;
  setName: (name: string) => void;
  addMidiMapping: (mapping: Omit<MidiMapping, "id">) => MidiMapping;
  removeMidiMapping: (id: string) => void;
  updateMidiMapping: (id: string, patch: Partial<MidiMapping>) => void;
  setMidiMappings: (mappings: MidiMapping[]) => void;
  autoMapNotesToCues: (startNote?: number) => void;
  addFixture: (opts?: Partial<Omit<Fixture, "id">>) => Fixture;
  removeFixture: (id: string) => void;
  updateFixture: (id: string, patch: Partial<Omit<Fixture, "id">>) => void;
  appendFixtures: (fixtures: Fixture[]) => void;
  loadSnapshot: (snap: ProjectSnapshot) => void;
  getSnapshot: () => ProjectSnapshot;
}
