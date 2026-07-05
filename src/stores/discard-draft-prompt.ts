import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface DiscardDraftPromptState {
  open: boolean;
  projectName: string;
  resolve: ((confirmed: boolean) => void) | null;
}

export const useDiscardDraftPromptStore = create<DiscardDraftPromptState>()(
  devtools(
    () => ({
      open: false,
      projectName: "",
      resolve: null,
    }),
    { name: "DiscardDraftPromptStore" },
  ),
);

export function requestDiscardDraftChoice(projectName: string): Promise<boolean> {
  return new Promise((resolve) => {
    useDiscardDraftPromptStore.setState({ open: true, projectName, resolve });
  });
}

export function resolveDiscardDraftChoice(confirmed: boolean): void {
  const { resolve } = useDiscardDraftPromptStore.getState();
  useDiscardDraftPromptStore.setState({ open: false, projectName: "", resolve: null });
  resolve?.(confirmed);
}
