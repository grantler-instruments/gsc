import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  dmxCueDataEqual,
  snapshotDmxCueData,
} from "../lib/dmx-preview-session";
import { getActiveCueListFromState } from "./project/helpers";
import type { ProjectState } from "./project/types";
import { useUiStore } from "./ui";
import type { DmxCueData } from "../types/cue";

export type DmxPreviewPendingAction =
  | { type: "none" }
  | { type: "select-cue"; cueId: string | null }
  | { type: "activate"; cueId: string };

export interface DmxPreviewConfirmState {
  cueId: string;
  baselineDmx: DmxCueData;
  pendingAction: DmxPreviewPendingAction;
}

interface DmxPreviewSessionState {
  session: { cueId: string; baselineDmx: DmxCueData } | null;
  confirm: DmxPreviewConfirmState | null;
  requestActivatePreview: (cueId: string) => void;
  requestDeactivatePreview: (cueId: string) => void;
  guardSelectCue: (nextCueId: string | null) => boolean;
  resolveConfirm: (keepChanges: boolean) => void;
  cancelConfirm: () => void;
  clearSessionForCue: (cueId: string) => void;
}

type ProjectGetState = () => ProjectState;

let getProjectState: ProjectGetState | null = null;

export function registerDmxPreviewProjectAccess(getState: ProjectGetState): void {
  getProjectState = getState;
}

function projectState(): ProjectState {
  if (!getProjectState) {
    throw new Error("Dmx preview project access is not registered");
  }
  return getProjectState();
}

function findCue(cueId: string) {
  const list = getActiveCueListFromState(projectState());
  return list.cues.find((cue) => cue.id === cueId);
}

function hasPreviewChanges(cueId: string, baselineDmx: DmxCueData): boolean {
  const cue = findCue(cueId);
  const fixtures = projectState().fixtures;
  if (!cue?.dmx) return false;
  return !dmxCueDataEqual(cue.dmx, baselineDmx, fixtures);
}

function setPreviewCueIds(cueIds: string[]): void {
  useUiStore.setState({ dmxPreviewCueIds: cueIds });
}

function endPreviewImmediate(cueId: string): void {
  const preview = useUiStore
    .getState()
    .dmxPreviewCueIds.filter((id) => id !== cueId);
  setPreviewCueIds(preview);
  useDmxPreviewSessionStore.setState((state) =>
    state.session?.cueId === cueId ? { session: null } : {},
  );
}

function startPreview(cueId: string, baselineDmx: DmxCueData): void {
  setPreviewCueIds([cueId]);
  useDmxPreviewSessionStore.setState({
    session: { cueId, baselineDmx },
    confirm: null,
  });
}

function openConfirm(state: DmxPreviewConfirmState): void {
  useDmxPreviewSessionStore.setState({ confirm: state });
}

function applyConfirmChoice(
  keepChanges: boolean,
  confirm: DmxPreviewConfirmState,
): void {
  if (!keepChanges) {
    projectState().updateCue(confirm.cueId, { dmx: confirm.baselineDmx });
  }
  endPreviewImmediate(confirm.cueId);
}

function runPendingAction(action: DmxPreviewPendingAction): void {
  if (action.type === "select-cue") {
    projectState().selectCue(action.cueId);
    return;
  }
  if (action.type === "activate") {
    useDmxPreviewSessionStore.getState().requestActivatePreview(action.cueId);
  }
}

export const useDmxPreviewSessionStore = create<DmxPreviewSessionState>()(
  devtools(
    (set, get) => ({
      session: null,
      confirm: null,

      requestActivatePreview: (cueId) => {
        const { session, confirm } = get();
        if (confirm) return;

        const cue = findCue(cueId);
        const fixtures = projectState().fixtures;
        if (!cue?.dmx) return;

        if (session && session.cueId !== cueId) {
          if (hasPreviewChanges(session.cueId, session.baselineDmx)) {
            openConfirm({
              cueId: session.cueId,
              baselineDmx: session.baselineDmx,
              pendingAction: { type: "activate", cueId },
            });
            return;
          }
          endPreviewImmediate(session.cueId);
        }

        if (session?.cueId === cueId) {
          setPreviewCueIds([cueId]);
          return;
        }

        startPreview(cueId, snapshotDmxCueData(cue.dmx, fixtures));
      },

      requestDeactivatePreview: (cueId) => {
        const { session, confirm } = get();
        if (confirm) return;
        if (!session || session.cueId !== cueId) {
          endPreviewImmediate(cueId);
          return;
        }

        if (hasPreviewChanges(cueId, session.baselineDmx)) {
          openConfirm({
            cueId,
            baselineDmx: session.baselineDmx,
            pendingAction: { type: "none" },
          });
          return;
        }

        endPreviewImmediate(cueId);
      },

      guardSelectCue: (nextCueId) => {
        const { session, confirm } = get();
        if (confirm) return false;
        if (!session) return true;
        if (nextCueId === session.cueId) return true;

        if (hasPreviewChanges(session.cueId, session.baselineDmx)) {
          openConfirm({
            cueId: session.cueId,
            baselineDmx: session.baselineDmx,
            pendingAction: { type: "select-cue", cueId: nextCueId },
          });
          return false;
        }

        endPreviewImmediate(session.cueId);
        return true;
      },

      resolveConfirm: (keepChanges) => {
        const { confirm } = get();
        if (!confirm) return;

        const pendingAction = confirm.pendingAction;
        applyConfirmChoice(keepChanges, confirm);
        set({ confirm: null });
        runPendingAction(pendingAction);
      },

      cancelConfirm: () => set({ confirm: null }),

      clearSessionForCue: (cueId) => {
        endPreviewImmediate(cueId);
        set((state) =>
          state.confirm?.cueId === cueId ? { confirm: null } : {},
        );
      },
    }),
    { name: "DmxPreviewSessionStore" },
  ),
);

export function guardDmxPreviewSelection(nextCueId: string | null): boolean {
  return useDmxPreviewSessionStore.getState().guardSelectCue(nextCueId);
}

export function isDmxPreviewActive(cueId: string): boolean {
  return useUiStore.getState().dmxPreviewCueIds.includes(cueId);
}

export function syncDmxPreviewSessionWithProject(): void {
  const session = useDmxPreviewSessionStore.getState().session;
  if (!session) return;
  if (!findCue(session.cueId)) {
    useDmxPreviewSessionStore.getState().clearSessionForCue(session.cueId);
  }
}
