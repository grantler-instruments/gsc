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

export function requestStartupProjectsChoice(options: {
  draft: PendingDraftProject | null;
  recents: RecentProjectEntry[];
}): Promise<StartupProjectsChoice> {
  return new Promise((resolve) => {
    useStartupProjectsPromptStore.setState({
      open: true,
      draft: options.draft,
      recents: options.recents,
      resolve,
    });
  });
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
