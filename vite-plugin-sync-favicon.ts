import type { Plugin } from "vite";
import { syncFaviconAssets } from "./scripts/favicon-assets";

export function syncFaviconPlugin(rootDir: string): Plugin {
  let synced = false;

  const syncOnce = () => {
    if (synced) return;
    synced = true;
    syncFaviconAssets(rootDir);
  };

  return {
    name: "sync-favicon",
    // Dev runs `npm run icons` before Vite starts (see package.json). Build still syncs here.
    buildStart() {
      syncOnce();
    },
  };
}
