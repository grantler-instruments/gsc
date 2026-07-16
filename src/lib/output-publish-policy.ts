export type OutputPublishPlatform = "tauri" | "web";

export interface OutputPublishOptions {
  forceAssets: boolean;
  forceState: boolean;
}

/** Tauri projects with a bound folder read assets from disk in the output webview. */
export function isDiskAssetMode(
  platform: OutputPublishPlatform,
  projectRootDir: string | null,
): boolean {
  return platform === "tauri" && !!projectRootDir;
}

/** Output `request-state` should not invalidate cached bridge posts in disk mode. */
export function shouldClearPostedAssetsOnRequestState(diskAssetMode: boolean): boolean {
  return !diskAssetMode;
}

export function publishOptionsForRequestState(diskAssetMode: boolean): OutputPublishOptions {
  return { forceAssets: !diskAssetMode, forceState: true };
}

export function publishOptionsForActiveCueChange(diskAssetMode: boolean): OutputPublishOptions {
  return { forceAssets: !diskAssetMode, forceState: true };
}

/** Large video blobs must not cross BroadcastChannel when disk mode is available. */
export function shouldPostAssetOverChannel(diskAssetMode: boolean): boolean {
  return !diskAssetMode;
}

/** Web bridge mode: repost only when forced or not yet posted. */
export function shouldPostCachedAssetOverChannel(
  alreadyPosted: boolean,
  forceAssets: boolean,
): boolean {
  if (!alreadyPosted) return true;
  return forceAssets;
}
