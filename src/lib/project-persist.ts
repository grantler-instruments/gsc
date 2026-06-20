import type { VfsEntry } from "../stores/vfs";
import type { AudioBus } from "../types/audio-bus";
import type { Fixture } from "../types/fixture";
import type { FixturePlot } from "../types/fixture-plot";
import type { MidiMapping } from "../types/midi-mapping";
import type { CueList } from "./cue-lists";

/** Fields that are written by getSnapshot() / persistPlatformProject(). */
export interface ProjectPersistSlice {
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
}

/** True when persisted project data changed (ignores cue selection state). */
export function projectPersistStateChanged(
  prev: ProjectPersistSlice,
  next: ProjectPersistSlice,
): boolean {
  if (
    prev.id !== next.id ||
    prev.name !== next.name ||
    prev.startDate !== next.startDate ||
    prev.endDate !== next.endDate ||
    prev.description !== next.description ||
    prev.activeCueListId !== next.activeCueListId ||
    prev.midiMappings !== next.midiMappings ||
    prev.fixtures !== next.fixtures ||
    prev.fixturePlot !== next.fixturePlot ||
    prev.audioBuses !== next.audioBuses
  ) {
    return true;
  }

  if (prev.cueLists.length !== next.cueLists.length) return true;

  for (let i = 0; i < prev.cueLists.length; i++) {
    const a = prev.cueLists[i];
    const b = next.cueLists[i];
    if (a.id !== b.id || a.name !== b.name || a.cues !== b.cues) {
      return true;
    }
  }

  return false;
}

/** True when asset metadata written to session storage changed. */
export function vfsPersistStateChanged(
  prev: { entries: VfsEntry[] },
  next: { entries: VfsEntry[] },
): boolean {
  if (prev.entries === next.entries) return false;
  if (prev.entries.length !== next.entries.length) return true;

  for (let i = 0; i < prev.entries.length; i++) {
    const a = prev.entries[i];
    const b = next.entries[i];
    if (
      a.path !== b.path ||
      a.name !== b.name ||
      a.size !== b.size ||
      a.mimeType !== b.mimeType ||
      a.kind !== b.kind
    ) {
      return true;
    }
  }

  return false;
}
