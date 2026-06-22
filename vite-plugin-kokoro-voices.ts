import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Plugin } from "vite";

/** Voice ids exposed in the TTS inspector — keep in sync with TTS_VOICE_OPTIONS. */
const KOKORO_VOICE_IDS = [
  "af_heart",
  "af_bella",
  "af_nova",
  "af_sarah",
  "af_sky",
  "am_adam",
  "am_michael",
  "am_puck",
  "bf_emma",
  "bm_george",
] as const;

function copyBundledVoices(srcDir: string, outDir: string): void {
  fs.mkdirSync(outDir, { recursive: true });
  for (const voiceId of KOKORO_VOICE_IDS) {
    const fileName = `${voiceId}.bin`;
    fs.copyFileSync(path.join(srcDir, fileName), path.join(outDir, fileName));
  }
}

function matchVoiceRequest(url: string | undefined, base: string): string | null {
  const pathOnly = (url ?? "").split("?")[0];
  const direct = pathOnly.match(/^\/kokoro\/voices\/([a-z0-9_]+)\.bin$/i);
  if (direct) return direct[1];

  const normalizedBase = base.replace(/\/$/, "");
  if (!normalizedBase) return null;
  const escapedBase = normalizedBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withBase = pathOnly.match(
    new RegExp(`^${escapedBase}/kokoro/voices/([a-z0-9_]+)\\.bin$`, "i"),
  );
  return withBase?.[1] ?? null;
}

function serveVoiceFile(
  srcDir: string,
  base: string,
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  const voiceId = matchVoiceRequest(req.url, base);
  if (!voiceId) {
    next();
    return;
  }

  const filePath = path.join(srcDir, `${voiceId}.bin`);
  if (!fs.existsSync(filePath)) {
    next();
    return;
  }

  res.setHeader("Content-Type", "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
}

/** Copy kokoro-js voice bins into public/ for offline TTS (dev serves from node_modules). */
export function kokoroVoicesPlugin(rootDir: string): Plugin {
  const srcDir = path.join(rootDir, "node_modules/kokoro-js/voices");

  return {
    name: "kokoro-voices",
    buildStart() {
      copyBundledVoices(srcDir, path.join(rootDir, "public/kokoro/voices"));
    },
    configureServer(server) {
      const base = server.config.base;
      server.middlewares.use((req, res, next) => {
        serveVoiceFile(srcDir, base, req, res, next);
      });
    },
  };
}
