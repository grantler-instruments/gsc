/** Toggle native fullscreen on the main app window. */
export async function toggleWindowFullscreen(): Promise<void> {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  await win.setFullscreen(!(await win.isFullscreen()));
}
