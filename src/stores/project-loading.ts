import { create } from "zustand";

export type AssetLoadStatus = "pending" | "loading" | "loaded" | "missing";

export interface AssetLoadProgress {
  path: string;
  name: string;
  status: AssetLoadStatus;
}

interface ProjectLoadingState {
  active: boolean;
  assetProgress: AssetLoadProgress[];
  setActive: (active: boolean) => void;
  initAssetProgress: (items: Array<{ path: string; name?: string }>) => void;
  setAssetStatus: (path: string, status: AssetLoadStatus) => void;
  clearAssetProgress: () => void;
}

function displayName(path: string, name?: string): string {
  return name ?? path.split("/").pop() ?? path;
}

export const useProjectLoadingStore = create<ProjectLoadingState>((set, get) => ({
  active: false,
  assetProgress: [],
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
}));

/** Let React paint ProjectLoadingScreen before heavy project work (avoids macOS beachball). */
export async function waitForLoadingScreenPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Show the in-app loading screen; call the returned function when load finishes. */
export async function beginProjectLoadUi(): Promise<() => void> {
  const store = useProjectLoadingStore.getState();
  const nested = store.active;
  if (!nested) {
    store.setActive(true);
    await waitForLoadingScreenPaint();
  }
  return () => {
    if (!nested) {
      const end = useProjectLoadingStore.getState();
      end.setActive(false);
      end.clearAssetProgress();
    }
  };
}

export async function withProjectLoading<T>(fn: () => Promise<T>): Promise<T> {
  const end = await beginProjectLoadUi();
  try {
    return await fn();
  } finally {
    end();
  }
}
