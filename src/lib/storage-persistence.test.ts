import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatStorageBytes,
  getStoragePressure,
  requestPersistentStorage,
} from "./storage-persistence";

describe("storage-persistence", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("formats storage bytes", () => {
    expect(formatStorageBytes(512)).toBe("512 B");
    expect(formatStorageBytes(2048)).toBe("2.0 KB");
    expect(formatStorageBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("returns ok when estimate is unavailable", async () => {
    expect(await getStoragePressure()).toBe("ok");
  });

  it("classifies storage pressure from estimate", async () => {
    vi.stubGlobal("navigator", {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 900, quota: 1000 }),
      },
    });
    expect(await getStoragePressure()).toBe("critical");
  });

  it("requests persistent storage once", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    const persisted = vi.fn().mockResolvedValue(false);
    vi.stubGlobal("navigator", {
      storage: { persist, persisted },
    });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    await expect(requestPersistentStorage()).resolves.toBe(false);
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
