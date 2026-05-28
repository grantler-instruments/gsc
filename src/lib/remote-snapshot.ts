import { usePlaybackStore } from "../stores/playback";
import { getActiveCueListFromState, useProjectStore } from "../stores/project";
import { useTransportStore } from "../stores/transport";
import { useUiStore } from "../stores/ui";
import type { RemoteSnapshot, RemoteTransportState } from "../types/remote";
import { applyFixtureChannelValuesToBuffers } from "./dmx";
import { groupDmxOutputChannelsByFixture, listDmxOutputChannels } from "./dmx-output";
import { snapshotToCueLists } from "./project-snapshot";

type Fixtures = ReturnType<typeof useProjectStore.getState>["fixtures"];

function buildFixtureChannelValues(fixtures: Fixtures) {
  if (fixtures.length === 0) return {};
  const groups = groupDmxOutputChannelsByFixture(listDmxOutputChannels(fixtures));
  return Object.fromEntries(
    groups.map((group) => [group.fixtureId, group.channels.map((channel) => channel.value)]),
  );
}

function cloneRemoteTransportState(state: RemoteTransportState): RemoteTransportState {
  return {
    isPlaying: state.isPlaying,
    activeCueId: state.activeCueId,
    activeCueIds: [...state.activeCueIds],
    cueStartedAtMs: { ...state.cueStartedAtMs },
    runningSequence: state.runningSequence
      ? {
          ...state.runningSequence,
          stepCueIds: [...state.runningSequence.stepCueIds],
        }
      : null,
    masterVolume: state.masterVolume,
  };
}

function buildTransportState(): RemoteTransportState {
  const { isPlaying, activeCueId, activeCueIds, cueStartedAtMs, runningSequence, masterVolume } =
    useTransportStore.getState();
  return cloneRemoteTransportState({
    isPlaying,
    activeCueId,
    activeCueIds,
    cueStartedAtMs,
    runningSequence: runningSequence
      ? { ...runningSequence, stepCueIds: runningSequence.stepCueIds }
      : null,
    masterVolume,
  });
}

function buildProjectSelectionSnapshot(project: ReturnType<typeof useProjectStore.getState>) {
  const list = getActiveCueListFromState(project);
  return {
    project: project.getSnapshot(),
    selectedCueIds: [...list.selectedCueIds],
    selectionAnchorId: list.selectionAnchorId,
  };
}

function buildUiSnapshot(fixtures: Fixtures) {
  const { dmxPreviewCueIds, fixturePlotExpanded } = useUiStore.getState();
  return {
    dmxPreviewCueIds: [...dmxPreviewCueIds],
    fixturePlotExpanded,
    fixtureChannelValues: buildFixtureChannelValues(fixtures),
  };
}

/** Build a JSON-serializable snapshot for remote clients. */
export function buildRemoteSnapshot(): RemoteSnapshot {
  const project = useProjectStore.getState();
  return {
    ...buildProjectSelectionSnapshot(project),
    transport: buildTransportState(),
    playback: { ...usePlaybackStore.getState().byCueId },
    ...buildUiSnapshot(project.fixtures),
  };
}

function applyProjectSnapshot(snapshot: RemoteSnapshot) {
  const loaded = snapshotToCueLists(snapshot.project);
  const activeList =
    loaded.cueLists.find((l) => l.id === loaded.activeCueListId) ?? loaded.cueLists[0];
  if (activeList) {
    activeList.selectedCueIds = [...snapshot.selectedCueIds];
    activeList.selectionAnchorId = snapshot.selectionAnchorId;
  }

  useProjectStore.setState({
    id: loaded.id,
    name: loaded.name,
    startDate: loaded.startDate,
    endDate: loaded.endDate,
    description: loaded.description,
    cueLists: loaded.cueLists,
    activeCueListId: loaded.activeCueListId,
    midiMappings: loaded.midiMappings,
    fixtures: loaded.fixtures,
    fixturePlot: loaded.fixturePlot,
  });

  return loaded.fixtures ?? [];
}

function applyRuntimeSnapshot(snapshot: RemoteSnapshot): void {
  useTransportStore.setState(cloneRemoteTransportState(snapshot.transport));
  usePlaybackStore.getState().setProgress(Object.values(snapshot.playback));
}

function applyUiSnapshot(snapshot: RemoteSnapshot, fixtures: Fixtures): void {
  useUiStore.setState({
    dmxPreviewCueIds: [...(snapshot.dmxPreviewCueIds ?? [])],
    fixturePlotExpanded: snapshot.fixturePlotExpanded ?? false,
  });

  if (snapshot.fixtureChannelValues && fixtures.length > 0) {
    applyFixtureChannelValuesToBuffers(fixtures, snapshot.fixtureChannelValues);
  }
}

/** Apply host snapshot on a remote client (does not run GO or engines). */
export function applyRemoteSnapshot(snapshot: RemoteSnapshot): void {
  const fixtures = applyProjectSnapshot(snapshot);
  applyRuntimeSnapshot(snapshot);
  applyUiSnapshot(snapshot, fixtures);
}

export function serializeRemoteSnapshot(): string {
  return JSON.stringify({ type: "snapshot", payload: buildRemoteSnapshot() });
}
