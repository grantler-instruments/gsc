import { useProjectStore } from "../stores/project";
import type { ProjectSnapshot } from "../types/cue";
import { setActiveProjectId } from "./active-project-id";
import { dismissCompactInspectorDrawer } from "./compact-inspector-drawer";
import type { CueList } from "./cue-lists";
import { type ProjectPersistSlice, projectPersistStateChanged } from "./project-persist";
import { cueListsToSnapshot, snapshotToCueLists } from "./project-snapshot";
import { canEditProject } from "./show-mode";

const MAX_UNDO_STACK = 50;
const COALESCE_MS = 400;

export interface ProjectHistoryEntry {
  snapshot: ProjectSnapshot;
  selections: Record<string, { selectedCueIds: string[]; selectionAnchorId: string | null }>;
}

let undoStack: ProjectHistoryEntry[] = [];
let redoStack: ProjectHistoryEntry[] = [];
let skipHistoryDepth = 0;
let lastRecordedAt = 0;

function captureSelections(
  cueLists: CueList[],
): Record<string, { selectedCueIds: string[]; selectionAnchorId: string | null }> {
  return Object.fromEntries(
    cueLists.map((list) => [
      list.id,
      {
        selectedCueIds: [...list.selectedCueIds],
        selectionAnchorId: list.selectionAnchorId,
      },
    ]),
  );
}

function captureEntry(state: ProjectPersistSlice & { cueLists: CueList[] }): ProjectHistoryEntry {
  return {
    snapshot: cueListsToSnapshot(
      state.id,
      state.name,
      state.cueLists,
      state.activeCueListId,
      state.midiMappings,
      state.fixtures,
      state.fixturePlot,
      state.startDate,
      state.endDate,
      state.description,
    ),
    selections: captureSelections(state.cueLists),
  };
}

function applyEntry(entry: ProjectHistoryEntry): void {
  runWithoutHistory(() => {
    const loaded = snapshotToCueLists(entry.snapshot);
    setActiveProjectId(loaded.id);
    useProjectStore.setState({
      ...loaded,
      cueLists: loaded.cueLists.map((list) => ({
        ...list,
        ...(entry.selections[list.id] ?? {
          selectedCueIds: [],
          selectionAnchorId: null,
        }),
      })),
    });
  });
}

function pushUndoEntry(entry: ProjectHistoryEntry): void {
  const now = Date.now();
  if (now - lastRecordedAt < COALESCE_MS) {
    return;
  }
  lastRecordedAt = now;
  undoStack.push(entry);
  if (undoStack.length > MAX_UNDO_STACK) {
    undoStack.shift();
  }
}

export function isHistoryRecordingEnabled(): boolean {
  return skipHistoryDepth === 0;
}

export function runWithoutHistory(run: () => void): void {
  skipHistoryDepth += 1;
  try {
    run();
  } finally {
    skipHistoryDepth -= 1;
  }
}

/** Clear undo/redo stacks after opening or creating a project. */
export function clearProjectHistory(): void {
  undoStack = [];
  redoStack = [];
  lastRecordedAt = 0;
}

export function replaceProjectWithoutHistory(run: () => void): void {
  clearProjectHistory();
  runWithoutHistory(run);
  dismissCompactInspectorDrawer();
}

export function recordProjectStateChange(
  prev: ProjectPersistSlice & { cueLists: CueList[] },
  next: ProjectPersistSlice & { cueLists: CueList[] },
): void {
  if (!isHistoryRecordingEnabled()) return;
  if (!canEditProject()) return;
  if (!projectPersistStateChanged(prev, next)) return;
  pushUndoEntry(captureEntry(prev));
  redoStack = [];
}

export function undoProjectEdit(): boolean {
  if (!canEditProject()) return false;
  const entry = undoStack.pop();
  if (!entry) return false;

  redoStack.push(captureEntry(useProjectStore.getState()));
  applyEntry(entry);
  lastRecordedAt = 0;
  return true;
}

export function redoProjectEdit(): boolean {
  if (!canEditProject()) return false;
  const entry = redoStack.pop();
  if (!entry) return false;

  undoStack.push(captureEntry(useProjectStore.getState()));
  if (undoStack.length > MAX_UNDO_STACK) {
    undoStack.shift();
  }
  applyEntry(entry);
  lastRecordedAt = 0;
  return true;
}

export function canUndoProjectEdit(): boolean {
  return canEditProject() && undoStack.length > 0;
}

export function canRedoProjectEdit(): boolean {
  return canEditProject() && redoStack.length > 0;
}

export function subscribeProjectHistory(): () => void {
  return useProjectStore.subscribe((next, prev) => {
    recordProjectStateChange(prev, next);
  });
}

/** Test-only reset of internal module state. */
export function resetProjectHistoryForTests(): void {
  clearProjectHistory();
  skipHistoryDepth = 0;
  lastRecordedAt = 0;
}
