import type { CueListInsertPlace } from "../../lib/cue-list-move";
import type { CueList } from "../../lib/cue-lists";
import type {
  Cue,
  CueListKind,
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

export interface ProjectState {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  cueLists: CueList[];
  /** The list with the current edit focus (selection, inspector, keyboard). */
  activeCueListId: string;
  /** Sequence list shown in the main cue panel (independent of edit focus). */
  mainSequenceListId: string;
  /** Hot list shown in the hot-cue panel, or null when none exist. */
  activeHotCueListId: string | null;
  midiMappings: MidiMapping[];
  fixtures: Fixture[];
  fixturePlot: FixturePlot;
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
    listId?: string,
  ) => Cue[];
  addGroupCue: (opts?: { name?: string; parentId?: string }) => Cue;
  addSequenceCue: (opts?: { name?: string; parentId?: string }) => Cue;
  addStopCueForTarget: (targetId: string) => Cue | null;
  addFadeCue: (fadeType: FadeCueType) => Cue;
  addFadeCueForTarget: (targetId: string, fadeType: FadeCueType) => Cue | null;
  updateCue: (id: string, patch: Partial<Cue>) => void;
  removeCue: (id: string) => void;
  removeCueFromList: (listId: string, id: string) => void;
  /** Remove every cue across all lists that references the given asset path. */
  removeCuesUsingAsset: (assetPath: string) => void;
  moveCueToGroup: (cueId: string, groupId: string | null) => void;
  moveCueToList: (cueId: string, targetListId: string, place: CueListInsertPlace) => void;
  reparentCueRelative: (draggedId: string, targetId: string, place: "before" | "after") => void;
  reparentCueToListEnd: (draggedId: string) => void;
  addSelectedCueToGroup: (groupId: string) => void;
  reorderCueRelative: (draggedId: string, targetId: string, place: "before" | "after") => void;
  selectCue: (id: string | null) => void;
  /** Select a cue in a specific list without changing edit focus. */
  selectCueInList: (listId: string, id: string | null) => void;
  toggleSelectCue: (id: string) => void;
  selectCueRange: (id: string, visibleOrder: string[]) => void;
  groupSelectedCues: () => Cue | null;
  ungroupCue: (cueId: string) => string[] | null;
  copySelectedCues: () => boolean;
  cutSelectedCues: () => boolean;
  pasteSelectedCues: () => boolean;
  duplicateSelectedCues: () => boolean;
  addCueList: (name?: string, kind?: CueListKind) => CueList;
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
