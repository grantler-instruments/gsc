import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type UnsavedProjectChoice = "save" | "discard" | "cancel";

export type UnsavedProjectBodyKey = "unsaved.body" | "unsaved.beforeDeleteBody";

interface UnsavedProjectPromptState {
  open: boolean;
  projectName: string;
  bodyKey: UnsavedProjectBodyKey;
  resolve: ((choice: UnsavedProjectChoice) => void) | null;
}

export const useUnsavedProjectPromptStore = create<UnsavedProjectPromptState>()(
  devtools(
    () => ({
      open: false,
      projectName: "",
      bodyKey: "unsaved.body" as UnsavedProjectBodyKey,
      resolve: null,
    }),
    { name: "UnsavedProjectPromptStore" },
  ),
);

export function requestUnsavedProjectChoice(
  projectName: string,
  bodyKey: UnsavedProjectBodyKey = "unsaved.body",
): Promise<UnsavedProjectChoice> {
  return new Promise((resolve) => {
    useUnsavedProjectPromptStore.setState({ open: true, projectName, bodyKey, resolve });
  });
}

export function resolveUnsavedProjectChoice(choice: UnsavedProjectChoice): void {
  const { resolve } = useUnsavedProjectPromptStore.getState();
  useUnsavedProjectPromptStore.setState({
    open: false,
    projectName: "",
    bodyKey: "unsaved.body",
    resolve: null,
  });
  resolve?.(choice);
}
