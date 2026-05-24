export const RECENT_PROJECTS_KEY = "gsc-tauri-recent-projects";
export const MAX_RECENT_PROJECTS = 10;

export interface RecentProjectEntry {
  path: string;
  name: string;
  openedAt: number;
}

function isRecentProjectEntry(value: unknown): value is RecentProjectEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as RecentProjectEntry;
  return (
    typeof entry.path === "string" &&
    typeof entry.name === "string" &&
    typeof entry.openedAt === "number"
  );
}

export function readRecentProjects(): RecentProjectEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentProjectEntry);
  } catch {
    return [];
  }
}

export function writeRecentProjects(entries: RecentProjectEntry[]): void {
  localStorage.setItem(
    RECENT_PROJECTS_KEY,
    JSON.stringify(entries.slice(0, MAX_RECENT_PROJECTS)),
  );
}

export function recordRecentProject(path: string, name: string): void {
  const trimmedName = name.trim() || "Untitled Show";
  const entries = readRecentProjects().filter((entry) => entry.path !== path);
  entries.unshift({ path, name: trimmedName, openedAt: Date.now() });
  writeRecentProjects(entries);
}

export function removeRecentProject(path: string): void {
  writeRecentProjects(readRecentProjects().filter((entry) => entry.path !== path));
}
