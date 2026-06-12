import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { IdbProjectSummary } from "../lib/project-idb";

export type WebOpenProjectsChoice =
  | { type: "open-stored"; projectId: string }
  | { type: "import" }
  | { type: "cancel" };

interface WebOpenProjectsPromptState {
  open: boolean;
  projects: IdbProjectSummary[];
  resolve: ((choice: WebOpenProjectsChoice) => void) | null;
}

export const useWebOpenProjectsPromptStore = create<WebOpenProjectsPromptState>()(
  devtools(
    () => ({
      open: false,
      projects: [],
      resolve: null,
    }),
    { name: "WebOpenProjectsPromptStore" },
  ),
);

export function requestWebOpenProjectsChoice(
  projects: IdbProjectSummary[],
): Promise<WebOpenProjectsChoice> {
  return new Promise((resolve) => {
    useWebOpenProjectsPromptStore.setState({
      open: true,
      projects,
      resolve,
    });
  });
}

export function resolveWebOpenProjectsChoice(choice: WebOpenProjectsChoice): void {
  const { resolve } = useWebOpenProjectsPromptStore.getState();
  useWebOpenProjectsPromptStore.setState({
    open: false,
    projects: [],
    resolve: null,
  });
  resolve?.(choice);
}

export function refreshWebOpenProjectsList(projects: IdbProjectSummary[]): void {
  useWebOpenProjectsPromptStore.setState({ projects });
}
