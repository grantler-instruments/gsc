import { useUiStore } from "../stores/ui";

export function isShowModeActive(): boolean {
  return useUiStore.getState().showMode;
}

export function canEditProject(): boolean {
  return !isShowModeActive();
}
