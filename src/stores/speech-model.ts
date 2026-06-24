import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  getLoadedKokoroTts,
  loadKokoroTts,
  preloadKokoroRuntimeModules,
  type SpeechModelLoadProgress,
  unloadKokoroTts,
} from "../lib/kokoro-engine";
import {
  clearSpeechModelCache,
  isSpeechModelInstalled,
  markSpeechModelInstalled,
} from "../lib/speech-model-cache";
import { usePreferencesStore } from "./preferences";

export type SpeechModelStatus = "idle" | "loading" | "ready" | "error";
export type SpeechModelLoadPhase = "download" | "init";

interface SpeechModelState {
  status: SpeechModelStatus;
  progress: number | null;
  loadPhase: SpeechModelLoadPhase | null;
  /** True only while the user clicked Download in Settings (not background warmup). */
  userDownloadActive: boolean;
  statusMessage: string | null;
  error: string | null;
  downloadModel: () => Promise<boolean>;
  warmUpIfReady: () => Promise<void>;
  clearModel: () => void;
}

function progressPercent(progress: SpeechModelLoadProgress): number | null {
  if (progress.loaded !== undefined && progress.total) {
    return Math.round((progress.loaded / progress.total) * 100);
  }
  return null;
}

function resolveLoadPhase(event: SpeechModelLoadProgress): SpeechModelLoadPhase {
  const pct = progressPercent(event);
  if (pct === 100) return "init";
  if (event.status === "ready" || event.status === "done") return "init";
  return "download";
}

export const useSpeechModelStore = create<SpeechModelState>()(
  devtools(
    (set, get) => ({
      status: "idle",
      progress: null,
      loadPhase: null,
      userDownloadActive: false,
      statusMessage: null,
      error: null,

      downloadModel: async () => {
        if (get().status === "loading") return false;
        if (getLoadedKokoroTts()) {
          await markSpeechModelInstalled();
          usePreferencesStore.getState().setSpeechModelReady(true);
          set({
            status: "ready",
            progress: 100,
            loadPhase: null,
            userDownloadActive: false,
            error: null,
            statusMessage: null,
          });
          return true;
        }

        set({
          status: "loading",
          progress: 0,
          loadPhase: "download",
          userDownloadActive: true,
          error: null,
          statusMessage: null,
        });
        preloadKokoroRuntimeModules();
        try {
          await loadKokoroTts(
            (event) => {
              const phase = resolveLoadPhase(event);
              set({
                progress: phase === "init" ? 100 : progressPercent(event),
                loadPhase: phase,
                statusMessage: phase === "init" ? null : (event.file ?? null),
              });
            },
            { allowRemoteModels: true },
          );
          await markSpeechModelInstalled();
          usePreferencesStore.getState().setSpeechModelReady(true);
          set({
            status: "ready",
            progress: 100,
            loadPhase: null,
            userDownloadActive: false,
            error: null,
            statusMessage: null,
          });
          return true;
        } catch (err) {
          unloadKokoroTts();
          usePreferencesStore.getState().setSpeechModelReady(false);
          const message = err instanceof Error ? err.message : String(err);
          set({
            status: "error",
            progress: null,
            loadPhase: null,
            userDownloadActive: false,
            error: message,
            statusMessage: null,
          });
          return false;
        }
      },

      warmUpIfReady: async () => {
        if (!usePreferencesStore.getState().speechModelReady) return;
        if (getLoadedKokoroTts()) {
          set({
            status: "ready",
            progress: 100,
            loadPhase: null,
            userDownloadActive: false,
            error: null,
            statusMessage: null,
          });
          return;
        }
        if (get().status === "loading") return;

        const installedOnDisk = await isSpeechModelInstalled();
        if (!installedOnDisk) {
          usePreferencesStore.getState().setSpeechModelReady(false);
          set({
            status: "idle",
            progress: null,
            loadPhase: null,
            userDownloadActive: false,
            error: null,
            statusMessage: null,
          });
          return;
        }

        set({
          status: "loading",
          progress: null,
          loadPhase: null,
          userDownloadActive: false,
          error: null,
          statusMessage: null,
        });
        preloadKokoroRuntimeModules();
        try {
          await loadKokoroTts(undefined, { allowRemoteModels: false });
          await markSpeechModelInstalled();
          set({
            status: "ready",
            progress: 100,
            loadPhase: null,
            userDownloadActive: false,
            error: null,
            statusMessage: null,
          });
        } catch (err) {
          unloadKokoroTts();
          const stillInstalled = await isSpeechModelInstalled();
          if (!stillInstalled) {
            usePreferencesStore.getState().setSpeechModelReady(false);
            set({
              status: "idle",
              progress: null,
              loadPhase: null,
              userDownloadActive: false,
              error: null,
              statusMessage: null,
            });
            return;
          }
          const message = err instanceof Error ? err.message : String(err);
          set({
            status: "error",
            progress: null,
            loadPhase: null,
            userDownloadActive: false,
            error: message,
            statusMessage: null,
          });
        }
      },

      clearModel: () => {
        unloadKokoroTts();
        void clearSpeechModelCache();
        usePreferencesStore.getState().setSpeechModelReady(false);
        set({
          status: "idle",
          progress: null,
          loadPhase: null,
          userDownloadActive: false,
          error: null,
          statusMessage: null,
        });
      },
    }),
    { name: "SpeechModelStore" },
  ),
);

export function isSpeechModelAvailable(): boolean {
  return usePreferencesStore.getState().speechModelReady;
}
