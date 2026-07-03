import { useEffect, useRef, useState } from "react";
import { subscribeOutputAssets } from "../lib/output-asset-bridge";
import { resolveOutputAssetObjectUrl } from "../lib/output-asset-resolver";
import { outputLayersMediaEqual } from "../lib/output-layer-sync";
import type { OutputLayer, OutputState } from "../types/output";

interface CueAssetBinding {
  assetPath: string;
  objectUrl: string;
}

function mergeLayersFromBindings(
  layers: OutputLayer[],
  bindings: Map<string, CueAssetBinding>,
): OutputLayer[] {
  const merged: OutputLayer[] = [];
  for (const layer of layers) {
    const binding = bindings.get(layer.cueId);
    if (binding?.assetPath === layer.assetPath) {
      merged.push({ ...layer, objectUrl: binding.objectUrl });
    }
  }
  return merged;
}

function setBinding(
  bindings: Map<string, CueAssetBinding>,
  cueId: string,
  assetPath: string,
  objectUrl: string,
): boolean {
  const existing = bindings.get(cueId);
  if (existing?.assetPath === assetPath) {
    return false;
  }

  bindings.set(cueId, { assetPath, objectUrl });
  return true;
}

/**
 * Output webviews resolve assets from disk (Tauri) or BroadcastChannel/cache (web).
 */
export function useResolvedOutputLayers(state: OutputState): OutputLayer[] {
  const [layers, setLayers] = useState<OutputLayer[]>([]);
  const [bindingsVersion, setBindingsVersion] = useState(0);
  const bindingsRef = useRef(new Map<string, CueAssetBinding>());
  const layersRef = useRef<OutputLayer[]>([]);
  const resolveRequestRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const assetSignature = [
    state.projectId,
    state.projectRootDir ?? "",
    ...state.layers.map((layer) => `${layer.cueId}:${layer.assetPath}`),
  ].join("|");

  const applyResolved = (resolved: OutputLayer[]) => {
    if (outputLayersMediaEqual(resolved, layersRef.current)) return;
    layersRef.current = resolved;
    setLayers(resolved);
  };

  // Sync media mount props whenever state or bindings change.
  useEffect(() => {
    if (state.layers.length === 0) {
      if (state.activeCueIds.length === 0) {
        applyResolved([]);
      }
      return;
    }

    const merged = mergeLayersFromBindings(state.layers, bindingsRef.current);
    if (merged.length === 0) return;

    applyResolved(merged);
  }, [state.layers, state.activeCueIds, bindingsVersion]);

  // Load missing asset bindings without cancelling on opacity/transport updates.
  useEffect(() => {
    const activeIds = new Set(state.layers.map((layer) => layer.cueId));
    for (const cueId of [...bindingsRef.current.keys()]) {
      if (!activeIds.has(cueId)) {
        bindingsRef.current.delete(cueId);
      }
    }

    const missing = state.layers.filter((layer) => {
      const binding = bindingsRef.current.get(layer.cueId);
      return !binding || binding.assetPath !== layer.assetPath;
    });

    if (missing.length === 0) {
      return;
    }

    const requestId = ++resolveRequestRef.current;

    void (async () => {
      let changed = false;

      for (const layer of missing) {
        const objectUrl = await resolveOutputAssetObjectUrl(
          state.projectId,
          state.projectRootDir,
          layer.assetPath,
        );
        if (resolveRequestRef.current !== requestId) return;

        if (!objectUrl) {
          console.warn(`[output] Asset not available: ${layer.assetPath}`);
          continue;
        }

        if (setBinding(bindingsRef.current, layer.cueId, layer.assetPath, objectUrl)) {
          changed = true;
        }
      }

      if (changed && resolveRequestRef.current === requestId) {
        setBindingsVersion((version) => version + 1);
      }
    })();
  }, [assetSignature, state.projectId, state.projectRootDir]);

  useEffect(() => {
    return subscribeOutputAssets(() => {
      const current = stateRef.current;
      const waitingForAsset = current.layers.some((layer) => {
        const existing = bindingsRef.current.get(layer.cueId);
        return !existing || existing.assetPath !== layer.assetPath;
      });
      if (!waitingForAsset) return;

      const requestId = ++resolveRequestRef.current;

      void (async () => {
        let changed = false;

        for (const layer of current.layers) {
          const existing = bindingsRef.current.get(layer.cueId);
          if (existing?.assetPath === layer.assetPath) continue;

          const objectUrl = await resolveOutputAssetObjectUrl(
            current.projectId,
            current.projectRootDir,
            layer.assetPath,
          );
          if (resolveRequestRef.current !== requestId) return;
          if (!objectUrl) continue;

          if (setBinding(bindingsRef.current, layer.cueId, layer.assetPath, objectUrl)) {
            changed = true;
          }
        }

        if (changed && resolveRequestRef.current === requestId) {
          setBindingsVersion((version) => version + 1);
        }
      })();
    });
  }, []);

  return layers;
}
