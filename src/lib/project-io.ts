import type { ProjectSnapshot } from "../types/cue";

export const GSC_FILE_EXTENSION = ".gsc";

export function downloadProject(snapshot: ProjectSnapshot): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const base = snapshot.name.replace(/[^\w.-]+/g, "_") || "show";
  a.href = url;
  a.download = `${base}${GSC_FILE_EXTENSION}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseProjectFile(text: string): ProjectSnapshot {
  const data = JSON.parse(text) as ProjectSnapshot;
  if (
    data.version === 2 &&
    typeof data.id === "string" &&
    Array.isArray(data.cueLists) &&
    typeof data.activeCueListId === "string"
  ) {
    return data;
  }
  throw new Error("Invalid .gsc project file");
}
