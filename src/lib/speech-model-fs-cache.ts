export const SPEECH_MODEL_CACHE_NAMES = ["transformers-cache", "kokoro-voices"] as const;

export type SpeechModelCacheName = (typeof SPEECH_MODEL_CACHE_NAMES)[number];

export type SpeechModelCacheProgress = {
  progress: number;
  loaded: number;
  total: number;
};

export interface SpeechModelCacheStorage {
  exists(path: string): Promise<boolean>;
  readBytes(path: string): Promise<Uint8Array>;
  readText(path: string): Promise<string>;
  writeBytes(path: string, data: Uint8Array): Promise<void>;
  appendBytes(path: string, data: Uint8Array): Promise<void>;
  writeText(path: string, data: string): Promise<void>;
  ensureDir(path: string): Promise<void>;
  removeDir(path: string): Promise<void>;
  /** When set, large cache bodies are read via the webview asset protocol (Tauri). */
  resolveAbsolutePath?(path: string): Promise<string | null>;
}

export function normalizeCacheRequest(request: RequestInfo | URL): string {
  if (typeof request === "string") return request;
  if (request instanceof URL) return request.href;
  return request.url;
}

export async function hashCacheKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function entryPaths(cacheDir: string, hash: string): { bodyPath: string; metaPath: string } {
  return {
    bodyPath: `${cacheDir}/${hash}.body`,
    metaPath: `${cacheDir}/${hash}.meta.json`,
  };
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

/** Minimal Cache API shim backed by durable files (used on Tauri). */
export class SpeechModelFsCache {
  constructor(
    private readonly cacheDir: string,
    private readonly storage: SpeechModelCacheStorage,
  ) {}

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    const key = normalizeCacheRequest(request);
    const hash = await hashCacheKey(key);
    const { bodyPath, metaPath } = entryPaths(this.cacheDir, hash);

    if (!(await this.storage.exists(bodyPath))) return undefined;

    const bodyResponse = await this.loadBodyResponse(bodyPath);
    if (!bodyResponse) return undefined;

    let headers: Record<string, string> | undefined;
    if (await this.storage.exists(metaPath)) {
      try {
        headers = JSON.parse(await this.storage.readText(metaPath)) as Record<string, string>;
      } catch {
        headers = undefined;
      }
    }

    if (!headers) return bodyResponse;

    const mergedHeaders = new Headers(bodyResponse.headers);
    for (const [name, value] of Object.entries(headers)) {
      mergedHeaders.set(name, value);
    }
    return new Response(bodyResponse.body, {
      status: bodyResponse.status,
      statusText: bodyResponse.statusText,
      headers: mergedHeaders,
    });
  }

  private async loadBodyResponse(bodyPath: string): Promise<Response | undefined> {
    if (this.storage.resolveAbsolutePath) {
      try {
        const absolutePath = await this.storage.resolveAbsolutePath(bodyPath);
        if (absolutePath) {
          const { convertFileSrc } = await import("@tauri-apps/api/core");
          const response = await fetch(convertFileSrc(absolutePath));
          if (response.ok) return response;
        }
      } catch {
        /* fall back to IPC read */
      }
    }

    const body = await this.storage.readBytes(bodyPath);
    return new Response(body);
  }

  async put(
    request: RequestInfo | URL,
    response: Response,
    progressCallback?: (progress: SpeechModelCacheProgress) => void,
  ): Promise<void> {
    const key = normalizeCacheRequest(request);
    const hash = await hashCacheKey(key);
    const { bodyPath, metaPath } = entryPaths(this.cacheDir, hash);

    await this.storage.ensureDir(this.cacheDir);

    const contentLength = response.headers.get("Content-Length");
    const total = contentLength ? Number.parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body?.getReader();
    if (!reader) {
      const body = new Uint8Array(await response.arrayBuffer());
      await this.storage.writeBytes(bodyPath, body);
      await this.storage.writeText(metaPath, JSON.stringify(headersToRecord(response.headers)));
      progressCallback?.({ progress: 100, loaded: body.byteLength, total: body.byteLength });
      return;
    }

    await this.storage.ensureDir(this.cacheDir);
    let started = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;

      if (!started) {
        await this.storage.writeBytes(bodyPath, value);
        started = true;
      } else {
        await this.storage.appendBytes(bodyPath, value);
      }

      loaded += value.byteLength;
      progressCallback?.({
        progress: total > 0 ? (loaded / total) * 100 : 0,
        loaded,
        total: total || loaded,
      });
    }

    await this.storage.writeText(metaPath, JSON.stringify(headersToRecord(response.headers)));
    progressCallback?.({ progress: 100, loaded, total: total || loaded });
  }
}

export function isSpeechModelCacheName(name: string): name is SpeechModelCacheName {
  return (SPEECH_MODEL_CACHE_NAMES as readonly string[]).includes(name);
}

export function speechModelCacheHasBodyFiles(entries: { name?: string }[]): boolean {
  return entries.some((entry) => entry.name?.endsWith(".body"));
}
