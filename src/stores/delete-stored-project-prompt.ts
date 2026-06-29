import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface DeleteStoredProjectPromptState {
  open: boolean;
  projectName: string;
  resolve: ((confirmed: boolean) => void) | null;
}

export const useDeleteStoredProjectPromptStore = create<DeleteStoredProjectPromptState>()(
  devtools(
    () => ({
      open: false,
      projectName: "",
      resolve: null,
    }),
    { name: "DeleteStoredProjectPromptStore" },
  ),
);

export function requestDeleteStoredProjectChoice(projectName: string): Promise<boolean> {
  return new Promise((resolve) => {
    useDeleteStoredProjectPromptStore.setState({ open: true, projectName, resolve });
  });
}

export function resolveDeleteStoredProjectChoice(confirmed: boolean): void {
  const { resolve } = useDeleteStoredProjectPromptStore.getState();
  useDeleteStoredProjectPromptStore.setState({ open: false, projectName: "", resolve: null });
  resolve?.(confirmed);
}
