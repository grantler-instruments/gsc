import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { AssetCueUsage } from "../lib/cue-asset";

export type DeleteAssetInUseChoice = "cancel" | "deleteCues";

interface DeleteAssetPromptState {
  open: boolean;
  assetName: string;
  cues: AssetCueUsage[];
  resolve: ((choice: DeleteAssetInUseChoice) => void) | null;
}

export const useDeleteAssetPromptStore = create<DeleteAssetPromptState>()(
  devtools(
    () => ({
      open: false,
      assetName: "",
      cues: [],
      resolve: null,
    }),
    { name: "DeleteAssetPromptStore" },
  ),
);

export function requestDeleteAssetInUseChoice(
  assetName: string,
  cues: AssetCueUsage[],
): Promise<DeleteAssetInUseChoice> {
  return new Promise((resolve) => {
    useDeleteAssetPromptStore.setState({ open: true, assetName, cues, resolve });
  });
}

export function resolveDeleteAssetInUseChoice(choice: DeleteAssetInUseChoice): void {
  const { resolve } = useDeleteAssetPromptStore.getState();
  useDeleteAssetPromptStore.setState({ open: false, assetName: "", cues: [], resolve: null });
  resolve?.(choice);
}
