import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type SaveProjectNowChoice = "save" | "later";

interface SaveProjectPromptState {
  open: boolean;
  projectName: string;
  resolve: ((choice: SaveProjectNowChoice) => void) | null;
}

export const useSaveProjectPromptStore = create<SaveProjectPromptState>()(
  devtools(
    () => ({
      open: false,
      projectName: "",
      resolve: null,
    }),
    { name: "SaveProjectPromptStore" },
  ),
);

export function requestSaveProjectNowChoice(projectName: string): Promise<SaveProjectNowChoice> {
  return new Promise((resolve) => {
    useSaveProjectPromptStore.setState({ open: true, projectName, resolve });
  });
}

export function resolveSaveProjectNowChoice(choice: SaveProjectNowChoice): void {
  const { resolve } = useSaveProjectPromptStore.getState();
  useSaveProjectPromptStore.setState({ open: false, projectName: "", resolve: null });
  resolve?.(choice);
}
