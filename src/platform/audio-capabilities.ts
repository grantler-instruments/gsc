import { canRouteAudioOutputDevice } from "../lib/audio-output";
import { getPlatform } from "./index";

export { canRouteAudioOutputDevice };

/** Desktop can enumerate outputs via cpal even when the WebView lacks setSinkId. */
export function canListAudioOutputDevices(): boolean {
  return getPlatform() === "tauri" || canRouteAudioOutputDevice();
}
