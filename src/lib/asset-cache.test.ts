import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheAsset, getCachedAsset } from "./asset-cache";

const CACHE_ORIGIN = "https://gsc-cache.local";
const storage = new Map<string, Response>();

function createMockCache(): Cache {
  return {
    match: async (request: string | Request) => {
      const key = typeof request === "string" ? request : request.url;
      return storage.get(key);
    },
    put: async (request: string | Request, response: Response) => {
      const key = typeof request === "string" ? request : request.url;
      storage.set(key, response);
    },
    delete: async (request: string | Request) => {
      const key = typeof request === "string" ? request : request.url;
      storage.delete(key);
    },
    keys: async () => [...storage.keys()],
    add: async () => {},
    addAll: async () => {},
    matchAll: async () => [],
  } as unknown as Cache;
}

describe("asset-cache", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("caches", {
      open: async () => createMockCache(),
    });
  });

  it("writes valid URL cache keys", async () => {
    const blob = new Blob(["audio"], { type: "audio/wav" });
    await cacheAsset("project-a", "/assets/clip.wav", blob);

    expect(storage.has(`${CACHE_ORIGIN}/projects/project-a/assets/clip.wav`)).toBe(true);
    expect(storage.has(`${CACHE_ORIGIN}/assets/clip.wav`)).toBe(true);
  });

  it("reads assets from path-only keys when scoped key misses", async () => {
    const blob = new Blob(["audio"], { type: "audio/wav" });
    await cacheAsset("project-a", "/assets/clip.wav", blob);

    const loaded = await getCachedAsset("project-b", "/assets/clip.wav");
    expect(loaded).toBeDefined();
    expect(await loaded?.text()).toBe("audio");
  });

  it("finds assets cached under legacy invalid scoped keys", async () => {
    const cache = createMockCache();
    const blob = new Blob(["video"], { type: "video/mp4" });
    await cache.put("old-project:/assets/clip.mp4", new Response(blob));

    vi.stubGlobal("caches", {
      open: async () => cache,
    });

    const loaded = await getCachedAsset("new-project", "/assets/clip.mp4");
    expect(loaded).toBeDefined();
    expect(await loaded?.text()).toBe("video");
  });

  it("finds assets cached under old path-only keys", async () => {
    const cache = createMockCache();
    const blob = new Blob(["audio"], { type: "audio/wav" });
    await cache.put("/assets/clip.wav", new Response(blob));

    vi.stubGlobal("caches", {
      open: async () => cache,
    });

    const loaded = await getCachedAsset("project-a", "/assets/clip.wav");
    expect(loaded).toBeDefined();
    expect(await loaded?.text()).toBe("audio");
  });

  it("still writes legacy keys when scoped put fails", async () => {
    const cache = createMockCache();
    const originalPut = cache.put.bind(cache);
    cache.put = async (request: RequestInfo | URL, response: Response) => {
      const key =
        typeof request === "string"
          ? request
          : request instanceof URL
            ? request.toString()
            : request.url;
      if (key.includes("/projects/")) {
        throw new TypeError("Invalid URL");
      }
      return originalPut(request as RequestInfo, response);
    };

    vi.stubGlobal("caches", {
      open: async () => cache,
    });

    const blob = new Blob(["audio"], { type: "audio/wav" });
    await cacheAsset("project-a", "/assets/clip.wav", blob);

    expect(storage.has(`${CACHE_ORIGIN}/assets/clip.wav`)).toBe(true);

    const loaded = await getCachedAsset("project-a", "/assets/clip.wav");
    expect(await loaded?.text()).toBe("audio");
  });
});
