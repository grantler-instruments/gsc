import { beforeEach, expect, it, vi } from "vitest";

vi.mock("../platform", () => ({ getPlatform: () => "web" }));
vi.mock("../platform/remote-mode", () => ({ isRemoteClient: () => false }));
vi.mock("../lib/active-project-id", () => ({ tryGetActiveProjectId: () => "project" }));
vi.mock("../lib/asset-cache", () => ({
  cacheAsset: vi.fn(async () => false),
  getCachedAsset: vi.fn(),
  removeCachedAsset: vi.fn(),
}));

import {
  pauseBlobEviction,
  vfsAllPaths,
  vfsClear,
  vfsEvictBlob,
  vfsGet,
  vfsGetObjectUrl,
  vfsHas,
  vfsPut,
} from "./engine";

beforeEach(() => vfsClear());
it("retains unsaved bytes and blobs with a media URL", async () => {
  vfsPut("/unsaved", new Blob(["data"]), { cache: false });
  expect(await vfsEvictBlob("/unsaved")).toBe(0);
  vfsPut("/video", new Blob(["data"]), { cache: false, persisted: true });
  vfsGetObjectUrl("/video");
  expect(await vfsEvictBlob("/video")).toBe(0);
});
it("keeps evicted assets listed and rechecks protection before dropping bytes", async () => {
  vfsPut("/saved", new Blob(["data"]), { cache: false, persisted: true });
  expect(await vfsEvictBlob("/saved", () => false)).toBe(0);
  expect(await vfsEvictBlob("/saved")).toBe(4);
  expect(vfsGet("/saved")).toBeUndefined();
  expect(vfsHas("/saved")).toBe(true);
  expect(vfsAllPaths()).toEqual(["/saved"]);
});

it("keeps file bytes resident throughout a save", async () => {
  vfsPut("/saved", new Blob(["data"]), { cache: false, persisted: true });
  const resume = pauseBlobEviction();
  expect(await vfsEvictBlob("/saved")).toBe(0);
  resume();
  expect(await vfsEvictBlob("/saved")).toBe(4);
});
