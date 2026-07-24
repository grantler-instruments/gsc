import { describe, expect, it } from "vitest";
import {
  isDiskAssetMode,
  publishOptionsForActiveCueChange,
  publishOptionsForRequestState,
  shouldClearPostedAssetsOnRequestState,
  shouldPostAssetOverChannel,
  shouldPostCachedAssetOverChannel,
} from "./output-publish-policy";

describe("output-publish-policy", () => {
  it("enables disk mode only for Tauri projects with a root folder", () => {
    expect(isDiskAssetMode("web", "/tmp/show.gsc")).toBe(false);
    expect(isDiskAssetMode("tauri", null)).toBe(false);
    expect(isDiskAssetMode("tauri", "/tmp/show.gsc")).toBe(true);
  });

  it("keeps request-state republish state-only in disk mode", () => {
    expect(publishOptionsForRequestState(true)).toEqual({
      forceAssets: false,
      forceState: true,
    });
    expect(publishOptionsForRequestState(false)).toEqual({
      forceAssets: true,
      forceState: true,
    });
  });

  it("does not clear bridge asset cache on request-state in disk mode", () => {
    expect(shouldClearPostedAssetsOnRequestState(true)).toBe(false);
    expect(shouldClearPostedAssetsOnRequestState(false)).toBe(true);
  });

  it("does not post assets over BroadcastChannel in disk mode", () => {
    expect(shouldPostAssetOverChannel(true)).toBe(false);
    expect(shouldPostAssetOverChannel(false)).toBe(true);
  });

  it("never posts assets over the bus on Tauri", () => {
    expect(shouldPostAssetOverChannel(false, "tauri")).toBe(false);
    expect(shouldPostAssetOverChannel(true, "tauri")).toBe(false);
  });

  it("matches active cue publish options to request-state policy", () => {
    expect(publishOptionsForActiveCueChange(true)).toEqual(publishOptionsForRequestState(true));
    expect(publishOptionsForActiveCueChange(false)).toEqual(publishOptionsForRequestState(false));
  });

  it("avoids reposting cached bridge assets unless forced", () => {
    expect(shouldPostCachedAssetOverChannel(false, false)).toBe(true);
    expect(shouldPostCachedAssetOverChannel(true, false)).toBe(false);
    expect(shouldPostCachedAssetOverChannel(true, true)).toBe(true);
  });
});
