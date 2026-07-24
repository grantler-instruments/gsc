import { loadBundledVoiceBytesForVoice } from "../lib/kokoro-voices-cache";

const KOKORO_VOICE_URL =
  /^https:\/\/huggingface\.co\/onnx-community\/Kokoro-82M-v1\.0-ONNX\/resolve\/main\/voices\/([a-z0-9_]+)\.bin/i;

function resolveFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/** Redirect Kokoro voice fetches to bundled local files (HF fetch hangs in WKWebView). */
export function installTauriKokoroFetchGuard(): void {
  if (typeof window === "undefined") return;

  const originalFetch = window.fetch.bind(window);
  const patched = originalFetch as typeof window.fetch & { __gscKokoroGuard?: boolean };
  if (patched.__gscKokoroGuard) return;

  window.fetch = async (input, init) => {
    const url = resolveFetchUrl(input);
    const match = url.match(KOKORO_VOICE_URL);
    if (match) {
      const body = await loadBundledVoiceBytesForVoice(match[1]);
      return new Response(body, {
        headers: { "Content-Type": "application/octet-stream" },
      });
    }
    return originalFetch(input, init);
  };

  (window.fetch as typeof window.fetch & { __gscKokoroGuard?: boolean }).__gscKokoroGuard = true;
}
