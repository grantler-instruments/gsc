import { createCueList } from "../../lib/cue-lists";
import type { Cue, CueType } from "../../types/cue";
import { useProjectStore } from "../../stores/project";
import { useUiStore } from "../../stores/ui";

export function testCue(
  id: string,
  name: string,
  type: CueType,
  extra: Partial<Cue> = {},
): Cue {
  return {
    id,
    number: "0",
    name,
    type,
    ...extra,
  };
}

export function resetTestProject(cues: Cue[] = []): string {
  useUiStore.setState({ showMode: false });
  const list = createCueList("Main");
  list.cues = cues;
  useProjectStore.setState({
    cueLists: [list],
    activeCueListId: list.id,
  });
  return list.id;
}

export function activeCues(): Cue[] {
  return useProjectStore.getState().cueLists[0]?.cues ?? [];
}
