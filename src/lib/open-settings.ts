import { useUiStore } from "../stores/ui";

export function openSettings(): void {
  useUiStore.getState().setSettingsDialogOpen(true);
}
