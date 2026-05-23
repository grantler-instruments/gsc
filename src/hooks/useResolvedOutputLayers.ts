import { useEffect, useRef, useState } from "react";
import { getCachedAsset } from "../lib/asset-cache";
import type { OutputLayer, OutputState } from "../types/output";

/**
 * Output webviews load assets from the origin-wide Cache API,
 * populated by the control window when cues go active.
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
        let blob: Blob | undefined;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          blob = await getCachedAsset(state.projectId, layer.assetPath);
          if (blob || cancelled) break;
          await new Promise((r) => setTimeout(r, 50));
        }

        if (cancelled) return;

        if (!blob) {
          console.warn(`[output] Asset not in cache: ${layer.assetPath}`);
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
  }, [state.layers, state.revision]);

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
