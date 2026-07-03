import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { RecentProjectEntry } from "../lib/recent-projects";

export interface PendingDraftProject {
  path: string;
  name: string;
}

export type StartupProjectsChoice =
  | { type: "restore-draft" }
  | { type: "open-recent"; path: string }
  | { type: "browse" }
  | { type: "new-show" };

interface StartupProjectsPromptState {
  open: boolean;
  draft: PendingDraftProject | null;
  recents: RecentProjectEntry[];
  resolve: ((choice: StartupProjectsChoice) => void) | null;
}

export const useStartupProjectsPromptStore = create<StartupProjectsPromptState>()(
  devtools(
    () => ({
      open: false,
      draft: null,
      recents: [],
      resolve: null,
    }),
    { name: "StartupProjectsPromptStore" },
  ),
);

let pendingStartupChoice: {
  promise: Promise<StartupProjectsChoice>;
  resolve: (choice: StartupProjectsChoice) => void;
  draft: PendingDraftProject | null;
  recents: RecentProjectEntry[];
} | null = null;

function showStartupProjectsDialog(options: {
  draft: PendingDraftProject | null;
  recents: RecentProjectEntry[];
  resolve: (choice: StartupProjectsChoice) => void;
}): void {
  useStartupProjectsPromptStore.setState({
    open: true,
    draft: options.draft,
    recents: options.recents,
    resolve: options.resolve,
  });
}

/** Re-open the dialog after remount/HMR if a startup choice is still pending. */
export function ensureStartupProjectsDialogVisible(): void {
  if (!pendingStartupChoice) return;
  const { open } = useStartupProjectsPromptStore.getState();
  if (open) return;
  showStartupProjectsDialog({
    draft: pendingStartupChoice.draft,
    recents: pendingStartupChoice.recents,
    resolve: pendingStartupChoice.resolve,
  });
}

export function requestStartupProjectsChoice(options: {
  draft: PendingDraftProject | null;
  recents: RecentProjectEntry[];
}): Promise<StartupProjectsChoice> {
  if (pendingStartupChoice) {
    pendingStartupChoice.draft = options.draft;
    pendingStartupChoice.recents = options.recents;
    showStartupProjectsDialog({
      draft: options.draft,
      recents: options.recents,
      resolve: pendingStartupChoice.resolve,
    });
    return pendingStartupChoice.promise;
  }

  let resolveChoice!: (choice: StartupProjectsChoice) => void;
  const promise = new Promise<StartupProjectsChoice>((resolve) => {
    resolveChoice = resolve;
  }).finally(() => {
    pendingStartupChoice = null;
  });

  pendingStartupChoice = {
    promise,
    resolve: resolveChoice,
    draft: options.draft,
    recents: options.recents,
  };
  showStartupProjectsDialog({
    draft: options.draft,
    recents: options.recents,
    resolve: resolveChoice,
  });
  return promise;
}

export function resolveStartupProjectsChoice(choice: StartupProjectsChoice): void {
  const { resolve } = useStartupProjectsPromptStore.getState();
  useStartupProjectsPromptStore.setState({
    open: false,
    draft: null,
    recents: [],
    resolve: null,
  });
  resolve?.(choice);
}
