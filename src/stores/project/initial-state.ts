import { t } from "../../i18n/t";
import { setActiveProjectId } from "../../lib/active-project-id";
import { createCueList } from "../../lib/cue-lists";
import { emptyFixturePlot } from "../../lib/fixture-plot";
import { randomId } from "../../lib/random-id";
import type { MidiMapping } from "../../types/midi-mapping";

export const initialList = createCueList(t("project.defaultListName"));
export const initialHotList = createCueList(t("project.defaultHotListName"), "hot");
export const initialProjectId = randomId();

setActiveProjectId(initialProjectId);

export const initialProjectData = {
  id: initialProjectId,
  name: t("project.defaultName"),
  cueLists: [initialList, initialHotList],
  activeCueListId: initialList.id,
  mainSequenceListId: initialList.id,
  activeHotCueListId: initialHotList.id as string | null,
  midiMappings: [] as MidiMapping[],
  fixtures: [],
  fixturePlot: emptyFixturePlot(),
  audioBuses: [],
};
