import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type UnsavedProjectChoice = "save" | "discard" | "cancel";

interface UnsavedProjectPromptState {
  open: boolean;
  projectName: string;
  resolve: ((choice: UnsavedProjectChoice) => void) | null;
}

export const useUnsavedProjectPromptStore = create<UnsavedProjectPromptState>()(
  devtools(
    () => ({
      open: false,
      projectName: "",
      resolve: null,
    }),
    { name: "UnsavedProjectPromptStore" },
  ),
);

export function requestUnsavedProjectChoice(projectName: string): Promise<UnsavedProjectChoice> {
  return new Promise((resolve) => {
    useUnsavedProjectPromptStore.setState({ open: true, projectName, resolve });
  });
}

export function resolveUnsavedProjectChoice(choice: UnsavedProjectChoice): void {
  const { resolve } = useUnsavedProjectPromptStore.getState();
  useUnsavedProjectPromptStore.setState({ open: false, projectName: "", resolve: null });
  resolve?.(choice);
}
