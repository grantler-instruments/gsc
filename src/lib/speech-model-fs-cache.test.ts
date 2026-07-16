import { describe, expect, it } from "vitest";
import {
  hashCacheKey,
  normalizeCacheRequest,
  type SpeechModelCacheStorage,
  SpeechModelFsCache,
  speechModelCacheHasBodyFiles,
} from "./speech-model-fs-cache";

function createMemoryStorage(): SpeechModelCacheStorage & {
  files: Map<string, string | Uint8Array>;
} {
  const files = new Map<string, string | Uint8Array>();
  return {
    files,
    exists: async (path) => files.has(path),
    readBytes: async (path) => {
      const value = files.get(path);
      if (value instanceof Uint8Array) return value;
      throw new Error(`Missing bytes at ${path}`);
    },
    readText: async (path) => {
      const value = files.get(path);
      if (typeof value === "string") return value;
      throw new Error(`Missing text at ${path}`);
    },
    writeBytes: async (path, data) => {
      files.set(path, data);
    },
    appendBytes: async (path, data) => {
      const existing = files.get(path);
      if (existing instanceof Uint8Array) {
        const merged = new Uint8Array(existing.byteLength + data.byteLength);
        merged.set(existing, 0);
        merged.set(data, existing.byteLength);
        files.set(path, merged);
        return;
      }
      files.set(path, data);
    },
    writeText: async (path, data) => {
      files.set(path, data);
    },
    ensureDir: async () => {},
    removeDir: async (path) => {
      for (const key of [...files.keys()]) {
        if (key.startsWith(`${path}/`) || key === path) files.delete(key);
      }
    },
  };
}

describe("speech-model-fs-cache", () => {
  it("normalizes cache request keys", () => {
    expect(normalizeCacheRequest("https://example.com/a.bin")).toBe("https://example.com/a.bin");
    expect(normalizeCacheRequest(new URL("https://example.com/a.bin"))).toBe(
      "https://example.com/a.bin",
    );
    expect(normalizeCacheRequest(new Request("https://example.com/a.bin"))).toBe(
      "https://example.com/a.bin",
    );
  });

  it("stores and retrieves cached responses", async () => {
    const storage = createMemoryStorage();
    const cache = new SpeechModelFsCache("/cache/transformers-cache", storage);
    const url = "https://huggingface.co/example/model.onnx";

    await cache.put(
      url,
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "application/octet-stream" },
      }),
    );

    const hit = await cache.match(url);
    expect(hit).toBeDefined();
    if (!hit) throw new Error("expected cache hit");
    expect(new Uint8Array(await hit.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(hit.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(await cache.match("https://huggingface.co/other.onnx")).toBeUndefined();
  });

  it("hashes cache keys deterministically", async () => {
    const a = await hashCacheKey("https://example.com/a");
    const b = await hashCacheKey("https://example.com/a");
    const c = await hashCacheKey("https://example.com/b");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("detects cached body files", () => {
    expect(speechModelCacheHasBodyFiles([{ name: "abc.body" }, { name: "abc.meta.json" }])).toBe(
      true,
    );
    expect(speechModelCacheHasBodyFiles([{ name: "abc.meta.json" }])).toBe(false);
  });
});
