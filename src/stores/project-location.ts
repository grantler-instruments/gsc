import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface ProjectLocationState {
  /** Absolute path to the `.gsc` project directory (contains project.json). */
  rootDir: string | null;
  setRootDir: (rootDir: string | null) => void;
}

export const useProjectLocationStore = create<ProjectLocationState>()(
  devtools(
    (set) => ({
      rootDir: null,
      setRootDir: (rootDir) => set({ rootDir }),
    }),
    { name: "ProjectLocationStore" },
  ),
);

export function projectDisplayName(rootDir: string | null): string | null {
  if (!rootDir) return null;
  const parts = rootDir.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] ?? rootDir;
}
