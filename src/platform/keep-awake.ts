import { getPlatform } from "./index";

/** Keep the system/display awake while enabled. */
export async function setKeepAwake(enabled: boolean): Promise<void> {
  if (getPlatform() === "tauri") {
    const { setKeepAwake: setTauriKeepAwake } = await import("./keep-awake.tauri");
    return setTauriKeepAwake(enabled);
  }
  const { setKeepAwake: setWebKeepAwake } = await import("./keep-awake.web");
  return setWebKeepAwake(enabled);
}
