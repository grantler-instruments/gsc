import { useEffect } from "react";
import { buildDmxPreviewFrames } from "../lib/dmx-preview";
import { sendDmxUniverses } from "../platform/send-dmx";
import { syncDmxPreviewSessionWithProject } from "../stores/dmx-preview-session";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useUiStore } from "../stores/ui";

function pushDmxPreviewOutput(): void {
  const { dmxPreviewCueIds } = useUiStore.getState();
  const project = useProjectStore.getState();
  const fixtures = project.fixtures;
  if (fixtures.length === 0) return;

  const activeList = getActiveCueListFromState(project);
  const validPreviewCueIds = dmxPreviewCueIds.filter((id) =>
    activeList.cues.some((cue) => cue.id === id),
  );

  if (validPreviewCueIds.length !== dmxPreviewCueIds.length) {
    useUiStore.setState({ dmxPreviewCueIds: validPreviewCueIds });
  }

  syncDmxPreviewSessionWithProject();

  const frames = buildDmxPreviewFrames(activeList.cues, validPreviewCueIds, fixtures);
  void sendDmxUniverses(frames);
}

/** Sends checked cue-list previews to DMX output. */
export function useCueDmxPreview(): void {
  useEffect(() => {
    pushDmxPreviewOutput();

    const unsubUi = useUiStore.subscribe((state, prev) => {
      if (state.dmxPreviewCueIds !== prev.dmxPreviewCueIds) {
        pushDmxPreviewOutput();
      }
    });

    const unsubProject = useProjectStore.subscribe((state, prev) => {
      const list = getActiveCueListFromState(state);
      const prevList = getActiveCueListFromState(prev);
      if (
        state.fixtures !== prev.fixtures ||
        list.cues !== prevList.cues ||
        state.activeCueListId !== prev.activeCueListId
      ) {
        pushDmxPreviewOutput();
      }
    });

    return () => {
      unsubUi();
      unsubProject();
    };
  }, []);
}
