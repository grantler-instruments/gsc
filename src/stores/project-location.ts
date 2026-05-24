import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface ProjectLocationState {
  /** Absolute path to the `.gsc` project directory (contains project.json). */
  rootDir: string | null;
  /** True when the project lives in an app-cache draft folder until first Save. */
  isTemporaryRoot: boolean;
  setRootDir: (rootDir: string | null, options?: { temporary?: boolean }) => void;
}

export const useProjectLocationStore = create<ProjectLocationState>()(
  devtools(
    (set) => ({
      rootDir: null,
      isTemporaryRoot: false,
      setRootDir: (rootDir, options) =>
        set({
          rootDir,
          isTemporaryRoot: rootDir ? (options?.temporary ?? false) : false,
        }),
    }),
    { name: "ProjectLocationStore" },
  ),
);

export function projectDisplayName(rootDir: string | null): string | null {
  if (!rootDir) return null;
  const parts = rootDir.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] ?? rootDir;
}
