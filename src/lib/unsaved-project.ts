import { t } from "../i18n/t";
import { getPlatform } from "../platform";
import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useVfsStore } from "../stores/vfs";
import type { ProjectSnapshot } from "../types/cue";

/** True when a project snapshot has content beyond a blank show. */
export function snapshotHasMeaningfulContent(snapshot: ProjectSnapshot): boolean {
  if (snapshot.version !== 2) return false;
  if (snapshot.name !== t("project.defaultName")) return true;
  if ((snapshot.fixtures ?? []).length > 0) return true;
  if ((snapshot.midiMappings ?? []).length > 0) return true;
  for (const list of snapshot.cueLists) {
    if (list.cues.length > 0) return true;
  }
  return false;
}

/** True when the open project has content beyond a blank show. */
export function hasMeaningfulProjectContent(): boolean {
  const snapshot = useProjectStore.getState().getSnapshot();
  if (snapshotHasMeaningfulContent(snapshot)) return true;
  return useVfsStore.getState().entries.length > 0;
}

/** True when the user should be prompted before replacing the open project. */
export function isProjectUnsaved(): boolean {
  if (getPlatform() === "tauri") {
    return useProjectLocationStore.getState().isTemporaryRoot && hasMeaningfulProjectContent();
  }
  return hasMeaningfulProjectContent();
}
