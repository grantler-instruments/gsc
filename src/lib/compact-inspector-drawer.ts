import { useUiStore } from "../stores/ui";

/** Keep the compact inspector drawer closed until the user selects a cue. */
export function dismissCompactInspectorDrawer(): void {
  useUiStore.getState().setCompactInspectorDrawerDismissed(true);
}

/** Re-open the compact inspector drawer after the user selects a cue in edit mode. */
export function reopenCompactInspectorDrawerIfEditing(): void {
  const { showMode, setCompactInspectorDrawerDismissed } = useUiStore.getState();
  if (!showMode) {
    setCompactInspectorDrawerDismissed(false);
  }
}
