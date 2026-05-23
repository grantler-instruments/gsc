import { useAppKeyboard } from "./useAppKeyboard";
import { useAudioEngine } from "./useAudioEngine";
import { useFadeAnimation } from "./useFadeAnimation";
import { useMidiEngine } from "./useMidiEngine";
import { useMidiInput } from "./useMidiInput";
import { useOscEngine } from "./useOscEngine";
import { useOutputPublisher } from "./useOutputPublisher";
import { usePlaybackProgress } from "./usePlaybackProgress";
import { usePreventBrowserFileDrop } from "./usePreventBrowserFileDrop";
import { useProjectSession } from "./useProjectSession";
import { useTauriAppMenu } from "./useTauriAppMenu";

/** Side-effect hooks for session restore, engines, and platform integration. */
export function useAppRuntime(): boolean {
  const sessionReady = useProjectSession();

  useAppKeyboard();
  useAudioEngine();
  useMidiEngine();
  useOscEngine();
  useMidiInput();
  useFadeAnimation();
  useOutputPublisher();
  usePlaybackProgress();
  usePreventBrowserFileDrop();
  useTauriAppMenu();

  return sessionReady;
}
