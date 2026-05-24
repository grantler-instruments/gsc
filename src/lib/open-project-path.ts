import { openDroppedProjectBundle, openDroppedProjectDir } from "../platform/project-storage";
import { isGscProjectDirPath, isProjectBundlePath } from "./project-paths";

/** Open a `.gsc` directory or `.gsc.zip` bundle from an OS file path. */
export async function openProjectPath(path: string): Promise<boolean> {
  if (isProjectBundlePath(path)) {
    return openDroppedProjectBundle(path);
  }
  if (isGscProjectDirPath(path)) {
    return openDroppedProjectDir(path);
  }
  return false;
}
