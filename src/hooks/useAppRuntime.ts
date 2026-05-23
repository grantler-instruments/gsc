import { useAppKeyboard } from "./useAppKeyboard";
import { useAudioEngine } from "./useAudioEngine";
import { useDmxEngine } from "./useDmxEngine";
import { useDmxFadeEngine } from "./useDmxFadeEngine";
import { useCueDmxPreview } from "./useCueDmxPreview";
import { useFadeAnimation } from "./useFadeAnimation";
import { useMidiEngine } from "./useMidiEngine";
import { useMidiInput } from "./useMidiInput";
import { useOscEngine } from "./useOscEngine";
import { useOutputPublisher } from "./useOutputPublisher";
import { usePlaybackProgress } from "./usePlaybackProgress";
import { usePreventBrowserFileDrop } from "./usePreventBrowserFileDrop";
import { useProjectSession } from "./useProjectSession";
import { useTauriAppMenu } from "./useTauriAppMenu";
import { useEnttecProConnection } from "./useEnttecProConnection";

/** Side-effect hooks for session restore, engines, and platform integration. */
export function useAppRuntime(): boolean {
  const sessionReady = useProjectSession();

  useAppKeyboard();
  useAudioEngine();
  useMidiEngine();
  useOscEngine();
  useDmxEngine();
  useDmxFadeEngine();
  useCueDmxPreview();
  useMidiInput();
  useFadeAnimation();
  useOutputPublisher();
  usePlaybackProgress();
  usePreventBrowserFileDrop();
  useTauriAppMenu();
  useEnttecProConnection();

  return sessionReady;
}
