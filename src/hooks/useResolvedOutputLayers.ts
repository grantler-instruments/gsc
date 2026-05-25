import { useEffect, useRef, useState } from "react";
import { getCachedAsset } from "../lib/asset-cache";
import { getOutputAssetBlob } from "../lib/output-asset-bridge";
import type { OutputLayer, OutputState } from "../types/output";

const CACHE_RETRY_MS = 50;
const CACHE_RETRIES = 40;

/**
 * Output webviews resolve assets from BroadcastChannel pushes first,
 * then fall back to the origin-wide Cache API populated by the control window.
 */
export function useResolvedOutputLayers(state: OutputState): OutputLayer[] {
  const [layers, setLayers] = useState<OutputLayer[]>([]);
  const urlsRef = useRef(new Map<string, string>());

  useEffect(() => {
    let cancelled = false;

    const activeIds = new Set(state.layers.map((l) => l.cueId));
    for (const [cueId, url] of [...urlsRef.current.entries()]) {
      if (!activeIds.has(cueId)) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(cueId);
      }
    }

    if (state.layers.length === 0) {
      setLayers([]);
      return;
    }

    void (async () => {
      const resolved: OutputLayer[] = [];

      for (const layer of state.layers) {
        let blob =
          getOutputAssetBlob(state.projectId, layer.assetPath) ??
          (await getCachedAsset(state.projectId, layer.assetPath));

        for (let attempt = 0; !blob && attempt < CACHE_RETRIES; attempt += 1) {
          if (cancelled) return;
          await new Promise((r) => setTimeout(r, CACHE_RETRY_MS));
          blob =
            getOutputAssetBlob(state.projectId, layer.assetPath) ??
            (await getCachedAsset(state.projectId, layer.assetPath));
        }

        if (cancelled) return;

        if (!blob) {
          console.warn(`[output] Asset not available: ${layer.assetPath}`);
          continue;
        }

        let localUrl = urlsRef.current.get(layer.cueId);
        if (!localUrl) {
          localUrl = URL.createObjectURL(blob);
          urlsRef.current.set(layer.cueId, localUrl);
        }

        resolved.push({ ...layer, objectUrl: localUrl });
      }

      if (!cancelled) {
        setLayers(resolved);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.layers, state.revision, state.projectId]);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const url of urls.values()) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, []);

  return layers;
}
