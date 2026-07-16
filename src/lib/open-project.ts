import { useProjectStore } from "../stores/project";
import { useProjectLocationStore } from "../stores/project-location";
import { useVfsStore } from "../stores/vfs";
import type { ProjectSnapshot } from "../types/cue";
import { hydrateVfsFromProjectCache, vfsClear } from "../vfs/engine";
import { setActiveProjectId } from "./active-project-id";
import { replaceProjectWithoutHistory } from "./project-history";
import { collectSessionAssetPaths } from "./project-session";
import { snapshotToCueLists } from "./project-snapshot";

/** Replace the open project and reload any cached assets for it. */
export async function openProjectSnapshot(snap: ProjectSnapshot): Promise<void> {
  vfsClear();
  useProjectLocationStore.getState().setRootDir(null);
  const loaded = snapshotToCueLists(snap, { initialOpen: true });
  replaceProjectWithoutHistory(() => {
    setActiveProjectId(loaded.id);
    useProjectStore.setState(loaded);
  });

  const snapshot = useProjectStore.getState().getSnapshot();
  if (snapshot.version !== 2) return;
  const paths = collectSessionAssetPaths(snapshot, []);
  await hydrateVfsFromProjectCache(loaded.id, paths);
  useVfsStore.getState().syncFromEngine();
}
