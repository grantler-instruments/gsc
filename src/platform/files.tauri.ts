/** Tauri filesystem adapter — stubs until fs plugin is wired up. */

export async function pickProjectFolder(): Promise<string | null> {
  // TODO: native dialog + fs plugin
  return null;
}
