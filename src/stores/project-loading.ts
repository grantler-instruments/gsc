import { create } from "zustand";

export type AssetLoadStatus = "pending" | "loading" | "loaded" | "missing";

export type RestoreStepStatus = "pending" | "active" | "done" | "error";

export interface AssetLoadProgress {
  path: string;
  name: string;
  status: AssetLoadStatus;
}

export interface RestoreStep {
  id: string;
  label: string;
  detail?: string;
  status: RestoreStepStatus;
}

interface ProjectLoadingState {
  active: boolean;
  assetProgress: AssetLoadProgress[];
  restoreSteps: RestoreStep[];
  setActive: (active: boolean) => void;
  initAssetProgress: (items: Array<{ path: string; name?: string }>) => void;
  setAssetStatus: (path: string, status: AssetLoadStatus) => void;
  clearAssetProgress: () => void;
  startRestoreStep: (id: string, label: string, detail?: string) => void;
  finishRestoreStep: (id: string, detail?: string) => void;
  failRestoreStep: (id: string, detail?: string) => void;
  clearRestoreSteps: () => void;
}

function displayName(path: string, name?: string): string {
  return name ?? path.split("/").pop() ?? path;
}

function markActiveStepsDone(steps: RestoreStep[]): RestoreStep[] {
  return steps.map((step) => (step.status === "active" ? { ...step, status: "done" } : step));
}

export const useProjectLoadingStore = create<ProjectLoadingState>((set, get) => ({
  active: false,
  assetProgress: [],
  restoreSteps: [],
  setActive: (active) => set({ active }),
  initAssetProgress: (items) => {
    const seen = new Set<string>();
    const assetProgress: AssetLoadProgress[] = [];
    for (const item of items) {
      if (seen.has(item.path)) continue;
      seen.add(item.path);
      assetProgress.push({
        path: item.path,
        name: displayName(item.path, item.name),
        status: "pending",
      });
    }
    assetProgress.sort((a, b) => a.path.localeCompare(b.path));
    set({ assetProgress });
  },
  setAssetStatus: (path, status) => {
    const { assetProgress } = get();
    if (!assetProgress.some((entry) => entry.path === path)) return;
    set({
      assetProgress: assetProgress.map((entry) =>
        entry.path === path ? { ...entry, status } : entry,
      ),
    });
  },
  clearAssetProgress: () => set({ assetProgress: [] }),
  startRestoreStep: (id, label, detail) =>
    set((state) => {
      const steps = markActiveStepsDone(state.restoreSteps);
      const existingIdx = steps.findIndex((step) => step.id === id);
      const nextStep: RestoreStep = { id, label, detail, status: "active" };
      if (existingIdx >= 0) {
        const next = [...steps];
        next[existingIdx] = { ...next[existingIdx], ...nextStep };
        return { restoreSteps: next };
      }
      return { restoreSteps: [...steps, nextStep] };
    }),
  finishRestoreStep: (id, detail) =>
    set((state) => ({
      restoreSteps: state.restoreSteps.map((step) =>
        step.id === id
          ? { ...step, status: "done", ...(detail !== undefined ? { detail } : {}) }
          : step,
      ),
    })),
  failRestoreStep: (id, detail) =>
    set((state) => ({
      restoreSteps: state.restoreSteps.map((step) =>
        step.id === id
          ? { ...step, status: "error", ...(detail !== undefined ? { detail } : {}) }
          : step,
      ),
    })),
  clearRestoreSteps: () => set({ restoreSteps: [] }),
}));

export async function withProjectLoading<T>(fn: () => Promise<T>): Promise<T> {
  useProjectLoadingStore.getState().setActive(true);
  try {
    return await fn();
  } finally {
    useProjectLoadingStore.getState().setActive(false);
    useProjectLoadingStore.getState().clearAssetProgress();
    useProjectLoadingStore.getState().clearRestoreSteps();
  }
}
