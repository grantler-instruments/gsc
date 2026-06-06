import { start, stop } from "tauri-plugin-keepawake-api";

let active = false;

/** Keep the system and display awake while enabled (desktop only). */
export async function setKeepAwake(enabled: boolean): Promise<void> {
  if (enabled === active) return;

  if (enabled) {
    await start({ display: true, idle: true, sleep: true });
    active = true;
    return;
  }

  await stop();
  active = false;
}
