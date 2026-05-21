export const isTauri = (): boolean =>
  typeof window !== "undefined" &&
  ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

export type PlatformKind = "web" | "tauri";

export const getPlatform = (): PlatformKind =>
  isTauri() ? "tauri" : "web";
