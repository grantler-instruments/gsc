import { useAppKeyboard } from "./useAppKeyboard";
import { useAudioEngine } from "./useAudioEngine";
import { useCueDmxPreview } from "./useCueDmxPreview";
import { useDmxEngine } from "./useDmxEngine";
import { useDmxFadeEngine } from "./useDmxFadeEngine";
import { useEnttecProConnection } from "./useEnttecProConnection";
import { useFadeAnimation } from "./useFadeAnimation";
import { useMidiEngine } from "./useMidiEngine";
import { useMidiInput } from "./useMidiInput";
import { useNdiOutputEngine } from "./useNdiOutputEngine";
import { useOscEngine } from "./useOscEngine";
import { useOutputPublisher } from "./useOutputPublisher";
import { usePlaybackProgress } from "./usePlaybackProgress";
import { usePreventBrowserFileDrop } from "./usePreventBrowserFileDrop";
import { useProjectHistory } from "./useProjectHistory";
import { useProjectSession } from "./useProjectSession";
import { useRemoteHost } from "./useRemoteHost";
import { useShowModeKeepAwake } from "./useShowModeKeepAwake";
import { useSpeechModelWarmup } from "./useSpeechModelWarmup";
import { useTauriAppMenu } from "./useTauriAppMenu";
import { useTauriOpenProject } from "./useTauriOpenProject";
import { useUpdateCheck } from "./useUpdateCheck";

/** Side-effect hooks for session restore, engines, and platform integration. */
export function useAppRuntime(): boolean {
  const sessionReady = useProjectSession();

  useProjectHistory();
  useShowModeKeepAwake();
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
  useNdiOutputEngine();
  usePlaybackProgress();
  usePreventBrowserFileDrop();
  useTauriAppMenu();
  useTauriOpenProject(sessionReady);
  useEnttecProConnection();
  useRemoteHost(sessionReady);
  useSpeechModelWarmup(sessionReady);
  useUpdateCheck(sessionReady);

  return sessionReady;
}
