import { createCueList } from "../../lib/cue-lists";
import { setActiveProjectId } from "../../lib/active-project-id";
import type { MidiMapping } from "../../types/midi-mapping";

export const initialList = createCueList("Main");
export const initialProjectId = crypto.randomUUID();

setActiveProjectId(initialProjectId);

export const initialProjectData = {
  id: initialProjectId,
  name: "Untitled Show",
  cueLists: [initialList],
  activeCueListId: initialList.id,
  midiMappings: [] as MidiMapping[],
};
