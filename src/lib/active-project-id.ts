/** Active project id for scoping persisted asset bytes (Cache API). */
let activeProjectId: string | null = null;

export function setActiveProjectId(id: string): void {
  activeProjectId = id;
}

export function getActiveProjectId(): string {
  if (!activeProjectId) {
    throw new Error("Active project id is not set");
  }
  return activeProjectId;
}

export function tryGetActiveProjectId(): string | undefined {
  return activeProjectId ?? undefined;
}
