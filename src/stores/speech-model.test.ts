import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPlatform } from "../platform";
import { usePreferencesStore } from "./preferences";
import { useSpeechModelStore } from "./speech-model";

vi.mock("../platform", () => ({
  getPlatform: vi.fn(() => "tauri"),
}));

vi.mock("../lib/kokoro-engine", () => ({
  getLoadedKokoroTts: vi.fn(() => null),
  loadKokoroTts: vi.fn(),
  preloadKokoroRuntimeModules: vi.fn(),
  unloadKokoroTts: vi.fn(),
}));

vi.mock("../lib/speech-model-cache", () => ({
  clearSpeechModelCache: vi.fn(async () => undefined),
  isSpeechModelInstalled: vi.fn(async () => false),
  markSpeechModelInstalled: vi.fn(async () => undefined),
}));

const invoke = vi.fn();
const listen = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listen(...args),
}));

function resetSpeechModelStore() {
  useSpeechModelStore.setState({
    status: "idle",
    progress: null,
    loadPhase: null,
    userDownloadActive: false,
    statusMessage: null,
    error: null,
  });
  usePreferencesStore.setState({ speechModelReady: false });
}

describe("speech-model store (desktop / Supertonic)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPlatform).mockReturnValue("tauri");
    resetSpeechModelStore();
    invoke.mockReset();
    listen.mockReset();
    listen.mockResolvedValue(vi.fn());
  });

  it("downloadModel ensures assets, loads engine, and marks ready", async () => {
    const calls: string[] = [];
    invoke.mockImplementation(async (cmd: string) => {
      calls.push(cmd);
      if (cmd === "supertonic_ensure_assets" || cmd === "supertonic_load") return undefined;
      throw new Error(`unexpected ${cmd}`);
    });

    const ok = await useSpeechModelStore.getState().downloadModel();

    expect(ok).toBe(true);
    expect(calls).toEqual(["supertonic_ensure_assets", "supertonic_load"]);
    expect(usePreferencesStore.getState().speechModelReady).toBe(true);
    expect(useSpeechModelStore.getState()).toMatchObject({
      status: "ready",
      progress: 100,
      loadPhase: null,
      userDownloadActive: false,
      error: null,
    });
  });

  it("applies download progress events to the store", async () => {
    let progressHandler:
      | ((event: { payload: { file: string; index: number; count: number } }) => void)
      | undefined;

    listen.mockImplementation(async (_event: string, handler: typeof progressHandler) => {
      progressHandler = handler;
      return vi.fn();
    });

    invoke.mockImplementation(async (cmd: string) => {
      if (cmd === "supertonic_ensure_assets") {
        progressHandler?.({
          payload: { file: "onnx/vocoder.onnx", index: 4, count: 16 },
        });
        expect(useSpeechModelStore.getState()).toMatchObject({
          status: "loading",
          loadPhase: "download",
          progress: 25,
          statusMessage: "onnx/vocoder.onnx",
          userDownloadActive: true,
        });
        return undefined;
      }
      if (cmd === "supertonic_load") return undefined;
      throw new Error(`unexpected ${cmd}`);
    });

    await useSpeechModelStore.getState().downloadModel();
    expect(listen).toHaveBeenCalledWith("supertonic-download-progress", expect.any(Function));
  });

  it("clearModel clears Supertonic assets and resets ready state", async () => {
    usePreferencesStore.setState({ speechModelReady: true });
    useSpeechModelStore.setState({
      status: "ready",
      progress: 100,
      loadPhase: null,
      userDownloadActive: false,
      statusMessage: null,
      error: null,
    });
    invoke.mockResolvedValue(undefined);

    useSpeechModelStore.getState().clearModel();

    expect(usePreferencesStore.getState().speechModelReady).toBe(false);
    expect(useSpeechModelStore.getState()).toMatchObject({
      status: "idle",
      progress: null,
      error: null,
    });

    await vi.waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("supertonic_clear_assets");
    });
  });

  it("downloadModel records errors and leaves the model not ready", async () => {
    invoke.mockRejectedValue(new Error("network down"));

    const ok = await useSpeechModelStore.getState().downloadModel();

    expect(ok).toBe(false);
    expect(usePreferencesStore.getState().speechModelReady).toBe(false);
    expect(useSpeechModelStore.getState()).toMatchObject({
      status: "error",
      error: "network down",
      userDownloadActive: false,
    });
  });
});
