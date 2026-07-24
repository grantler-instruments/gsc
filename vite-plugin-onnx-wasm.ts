import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Plugin } from "vite";

const ORT_PREFIX = "ort-wasm";

function copyOnnxWasmFiles(srcDir: string, outDir: string): void {
  fs.mkdirSync(outDir, { recursive: true });
  for (const fileName of fs.readdirSync(srcDir)) {
    if (!fileName.startsWith(ORT_PREFIX)) continue;
    fs.copyFileSync(path.join(srcDir, fileName), path.join(outDir, fileName));
  }
}

function matchOrtRequest(url: string | undefined, base: string): string | null {
  const pathOnly = (url ?? "").split("?")[0];
  const direct = pathOnly.match(/^\/ort\/(ort-wasm.+)$/i);
  if (direct) return direct[1];

  const normalizedBase = base.replace(/\/$/, "");
  if (!normalizedBase) return null;
  const escapedBase = normalizedBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withBase = pathOnly.match(new RegExp(`^${escapedBase}/ort/(ort-wasm.+)$`, "i"));
  return withBase?.[1] ?? null;
}

function serveOrtFile(
  srcDir: string,
  base: string,
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  const fileName = matchOrtRequest(req.url, base);
  if (!fileName) {
    next();
    return;
  }

  const filePath = path.join(srcDir, fileName);
  if (!fs.existsSync(filePath)) {
    next();
    return;
  }

  if (fileName.endsWith(".wasm")) {
    res.setHeader("Content-Type", "application/wasm");
  } else if (fileName.endsWith(".mjs")) {
    res.setHeader("Content-Type", "text/javascript");
  }
  fs.createReadStream(filePath).pipe(res);
}

/** Ship ONNX Runtime WASM with the app (Tauri webview cannot rely on CDN fetches). */
export function onnxWasmPlugin(rootDir: string): Plugin {
  const srcDir = path.join(rootDir, "node_modules/@huggingface/transformers/dist");

  return {
    name: "onnx-wasm",
    buildStart() {
      copyOnnxWasmFiles(srcDir, path.join(rootDir, "public/ort"));
    },
    configureServer(server) {
      const base = server.config.base;
      server.middlewares.use((req, res, next) => {
        serveOrtFile(srcDir, base, req, res, next);
      });
    },
  };
}
