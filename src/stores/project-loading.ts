import { create } from "zustand";

interface ProjectLoadingState {
  active: boolean;
  setActive: (active: boolean) => void;
}

export const useProjectLoadingStore = create<ProjectLoadingState>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
}));

export async function withProjectLoading<T>(fn: () => Promise<T>): Promise<T> {
  useProjectLoadingStore.getState().setActive(true);
  try {
    return await fn();
  } finally {
    useProjectLoadingStore.getState().setActive(false);
  }
}
