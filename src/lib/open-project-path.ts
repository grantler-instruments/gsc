import { openDroppedProjectBundle, openDroppedProjectDir } from "../platform/project-storage";
import { isGscProjectDirPath, isProjectBundlePath } from "./project-paths";
import { isQlab5WorkspacePath } from "./qlab5/import-qlab5-project";
import { confirmAndImportQlab5Path, isQlab5ProjectFolderPath } from "./qlab5-import-actions";

/** Open a `.gsc` directory, `.gsc.zip` bundle, or import a QLab 5 project. */
export async function openProjectPath(path: string): Promise<boolean> {
  if (isProjectBundlePath(path)) {
    return openDroppedProjectBundle(path);
  }
  if (isGscProjectDirPath(path)) {
    return openDroppedProjectDir(path);
  }
  if (isQlab5WorkspacePath(path)) {
    return confirmAndImportQlab5Path(path);
  }
  if (await isQlab5ProjectFolderPath(path)) {
    return confirmAndImportQlab5Path(path);
  }
  return false;
}
