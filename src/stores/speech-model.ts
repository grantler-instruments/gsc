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
import { getPlatform } from "../platform";
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

type SupertonicDownloadProgress = {
  file: string;
  index: number;
  count: number;
};

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

async function downloadSupertonicModel(
  set: (partial: Partial<SpeechModelState>) => void,
): Promise<boolean> {
  const { invoke } = await import("@tauri-apps/api/core");
  const { listen } = await import("@tauri-apps/api/event");

  set({
    status: "loading",
    progress: 0,
    loadPhase: "download",
    userDownloadActive: true,
    error: null,
    statusMessage: null,
  });

  let unlisten: (() => void) | undefined;
  try {
    unlisten = await listen<SupertonicDownloadProgress>("supertonic-download-progress", (event) => {
      const { file, index, count } = event.payload;
      set({
        progress: Math.round((index / Math.max(count, 1)) * 100),
        loadPhase: "download",
        statusMessage: file,
      });
    });

    await invoke("supertonic_ensure_assets");
    set({ loadPhase: "init", progress: 100, statusMessage: null });
    await invoke("supertonic_load");
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
  } finally {
    unlisten?.();
  }
}

async function warmSupertonicIfReady(
  set: (partial: Partial<SpeechModelState>) => void,
  get: () => SpeechModelState,
): Promise<void> {
  if (!usePreferencesStore.getState().speechModelReady) return;
  if (get().status === "loading") return;

  const { invoke } = await import("@tauri-apps/api/core");
  const installedOnDisk = await invoke<boolean>("supertonic_assets_ready");
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
    loadPhase: "init",
    userDownloadActive: false,
    error: null,
    statusMessage: null,
  });
  try {
    await invoke("supertonic_load");
    set({
      status: "ready",
      progress: 100,
      loadPhase: null,
      userDownloadActive: false,
      error: null,
      statusMessage: null,
    });
  } catch (err) {
    const stillInstalled = await invoke<boolean>("supertonic_assets_ready").catch(() => false);
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

        if (getPlatform() === "tauri") {
          return downloadSupertonicModel(set);
        }

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
        if (getPlatform() === "tauri") {
          await warmSupertonicIfReady(set, get);
          return;
        }

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
        if (getPlatform() === "tauri") {
          void import("@tauri-apps/api/core").then(({ invoke }) =>
            invoke("supertonic_clear_assets"),
          );
        } else {
          unloadKokoroTts();
          void clearSpeechModelCache();
        }
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
