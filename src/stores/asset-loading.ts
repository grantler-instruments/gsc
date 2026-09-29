import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface AssetLoadingState {
  /** In-flight loads (fetch / decode) per asset path, ref-counted across callers. */
  loadingByPath: Record<string, number>;
}

export const useAssetLoadingStore = create<AssetLoadingState>()(
  devtools(() => ({ loadingByPath: {} }), { name: "AssetLoadingStore" }),
);

function adjust(assetPath: string, delta: number): void {
  useAssetLoadingStore.setState((state) => {
    const count = (state.loadingByPath[assetPath] ?? 0) + delta;
    const next = { ...state.loadingByPath };
    if (count > 0) next[assetPath] = count;
    else delete next[assetPath];
    return { loadingByPath: next };
  });
}

/** Mark an asset as loading until the promise settles. */
export function trackAssetLoading<T>(assetPath: string, pending: Promise<T>): Promise<T> {
  adjust(assetPath, 1);
  return pending.finally(() => adjust(assetPath, -1));
}

export function markAssetLoading(assetPath: string, loading: boolean): void {
  adjust(assetPath, loading ? 1 : -1);
}

export function useIsAssetLoading(assetPath: string | undefined): boolean {
  return useAssetLoadingStore((s) => (assetPath ? Boolean(s.loadingByPath[assetPath]) : false));
}
