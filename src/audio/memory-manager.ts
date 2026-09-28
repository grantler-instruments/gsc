/**
 * Frees media RAM only when the system is running low.
 *
 * Never touches assets that are playing, standing by (selection + lookahead)
 * or sitting in a hot cue bank. With enough
 * RAM this does nothing: the caches keep everything, as before.
 */

import type { CueList } from "../lib/cue-lists";
import { flattenVisibleCueIds, getPrimarySelectedCueId } from "../lib/cue-selection";
import { getChildCues, isContainerCue } from "../lib/cues";
import { getMemoryPressure, type MemoryPressure } from "../platform/performance-stats";
import type { RunningSequence } from "../stores/transport";
import type { Cue } from "../types/cue";
import { normalizePath, vfsEvictBlob, vfsResidentEntries } from "../vfs/engine";
import { assetKindFromPath } from "../vfs/import";
import {
  evictAudioBuffer,
  listAudioCacheEntries,
  preloadAudioBuffer,
  subscribeAudioDecodes,
} from "./buffer-cache";

const MB = 1024 * 1024;

/** Cues after the standby cue whose media stays resident. */
export const LOOKAHEAD_CUES = 5;
/** Low RAM: available below max(1 GB, 10% of total). */
export const LOW_MIN_MB = 1024;
export const LOW_FRACTION = 0.1;
/** Recovered: evict until available is back above max(1.5 GB, 15% of total). */
export const RECOVER_MIN_MB = 1536;
export const RECOVER_FRACTION = 0.15;
export const POLL_INTERVAL_MS = 5000;

export interface ProtectionInput {
  cueLists: CueList[];
  activeCueIds: string[];
  runningSequences: Record<string, RunningSequence>;
  lookahead?: number;
}

/** Asset paths that must stay in RAM: playing, standby + lookahead, selected, hot banks. */
export function computeProtectedPaths(input: ProtectionInput): Set<string> {
  const lookahead = input.lookahead ?? LOOKAHEAD_CUES;
  const protectedPaths = new Set<string>();
  const cueById = new Map<string, { cue: Cue; cues: Cue[] }>();
  for (const list of input.cueLists) {
    for (const cue of list.cues) cueById.set(cue.id, { cue, cues: list.cues });
  }

  const visited = new Set<string>();
  const protectCue = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const found = cueById.get(id);
    if (!found) return;
    if (found.cue.assetPath) protectedPaths.add(normalizePath(found.cue.assetPath));
    if (isContainerCue(found.cue)) {
      for (const child of getChildCues(found.cues, id)) protectCue(child.id);
    }
  };

  for (const id of input.activeCueIds) protectCue(id);
  for (const seq of Object.values(input.runningSequences)) {
    protectCue(seq.rootId);
    for (const id of seq.stepCueIds) protectCue(id);
  }

  for (const list of input.cueLists) {
    if (list.kind === "hot") {
      for (const cue of list.cues) protectCue(cue.id);
      continue;
    }
    for (const id of list.selectedCueIds) protectCue(id);
    const standbyId = getPrimarySelectedCueId(list.selectedCueIds);
    if (!standbyId) continue;
    const order = flattenVisibleCueIds(list.cues, new Set());
    const start = order.indexOf(standbyId);
    if (start < 0) continue;
    for (const id of order.slice(start, start + 1 + lookahead)) protectCue(id);
  }

  return protectedPaths;
}

export interface EvictionCandidate {
  path: string;
  /** "buffer" = decoded PCM; "blob" = raw file bytes in the VFS. */
  kind: "buffer" | "blob";
  bytes: number;
  lastUsedMs: number;
}

/** Pick unprotected media least recently used first, up to the requested byte target. */
export function planEviction(
  candidates: EvictionCandidate[],
  protectedPaths: Set<string>,
  targetBytes: number,
): EvictionCandidate[] {
  if (targetBytes <= 0) return [];
  const rest = candidates
    .filter((c) => !protectedPaths.has(c.path))
    .sort((a, b) => a.lastUsedMs - b.lastUsedMs);

  const plan: EvictionCandidate[] = [];
  let total = 0;
  for (const c of rest) {
    if (total >= targetBytes) break;
    plan.push(c);
    total += c.bytes;
  }
  return plan;
}

/** Bytes to free to get back above the recover threshold; 0 when RAM is not low. */
export function memoryShortfallBytes(pressure: MemoryPressure, recovering = false): number {
  if (
    !Number.isFinite(pressure.totalMb) ||
    !Number.isFinite(pressure.availableMb) ||
    pressure.totalMb <= 0 ||
    pressure.availableMb < 0
  )
    return 0;
  const lowMb = Math.max(LOW_MIN_MB, pressure.totalMb * LOW_FRACTION);
  if (!recovering && pressure.availableMb >= lowMb) return 0;
  const recoverMb = Math.max(RECOVER_MIN_MB, pressure.totalMb * RECOVER_FRACTION);
  return Math.max(0, (recoverMb - pressure.availableMb) * MB);
}

function collectCandidates(): EvictionCandidate[] {
  const lastUsedByPath = new Map<string, number>();
  const candidates: EvictionCandidate[] = listAudioCacheEntries().map((e) => {
    const path = normalizePath(e.path);
    lastUsedByPath.set(path, e.lastUsedMs);
    return { path, kind: "buffer", bytes: e.bytes, lastUsedMs: e.lastUsedMs };
  });
  for (const { path, bytes } of vfsResidentEntries()) {
    const kind = assetKindFromPath(path);
    if (kind !== "audio" && kind !== "video") continue;
    candidates.push({ path, kind: "blob", bytes, lastUsedMs: lastUsedByPath.get(path) ?? 0 });
  }
  return candidates;
}

/** Paths whose decoded audio was evicted; re-decoded when they come back into standby. */
const evictedAudioPaths = new Set<string>();

/** Run one eviction pass. Returns bytes released from cache (OS reclamation is asynchronous). */
export async function runEvictionPass(
  getProtectedPaths: () => Set<string>,
  targetBytes: number,
): Promise<number> {
  const plan = planEviction(collectCandidates(), getProtectedPaths(), Infinity);
  let freed = 0;
  const freedPaths: string[] = [];
  for (const c of plan) {
    if (freed >= targetBytes) break;
    if (getProtectedPaths().has(c.path)) continue;
    const bytes =
      c.kind === "buffer"
        ? evictAudioBuffer(c.path)
        : await vfsEvictBlob(c.path, () => !getProtectedPaths().has(c.path));
    if (bytes > 0) {
      freed += bytes;
      freedPaths.push(`${c.kind}:${c.path}`);
      if (c.kind === "buffer") evictedAudioPaths.add(c.path);
    }
  }
  if (freed > 0) {
    console.info(
      `[memory] Low RAM: released cache references for ${(freed / MB).toFixed(1)} MB (${freedPaths.length} items)`,
      freedPaths,
    );
  }
  return freed;
}

/** Re-decode evicted audio that is protected again (standby moved onto it). */
export function preloadEvictedProtected(protectedPaths: Set<string>): void {
  for (const path of evictedAudioPaths) {
    if (!protectedPaths.has(path)) continue;
    evictedAudioPaths.delete(path);
    preloadAudioBuffer(path);
  }
}

export interface MemoryManagerOptions {
  getProtection: () => ProtectionInput;
  subscribe: (onChange: () => void) => () => void;
  /** Tauri: poll system RAM. Web: no reliable OS API, so polling is disabled. */
  pollPressure: boolean;
}

/** Starts polling / listeners; returns a stop function. */
export function startMemoryManager(options: MemoryManagerOptions): () => void {
  let stopped = false;
  let running = false;
  let recovering = false;

  const protectedNow = () => computeProtectedPaths(options.getProtection());

  const check = async () => {
    if (stopped || running) return;
    running = true;
    try {
      const pressure = await getMemoryPressure();
      if (!pressure) return;
      const shortfall = memoryShortfallBytes(pressure, recovering);
      recovering = shortfall > 0;
      if (shortfall > 0)
        await runEvictionPass(
          () => (stopped ? new Set(collectCandidates().map((c) => c.path)) : protectedNow()),
          shortfall,
        );
    } catch (err) {
      console.warn("[memory] Pressure check failed", err);
    } finally {
      running = false;
    }
  };

  const onStateChange = () => {
    if (evictedAudioPaths.size > 0) preloadEvictedProtected(protectedNow());
  };

  const unsubscribe = options.subscribe(onStateChange);
  const unsubscribeDecodes = subscribeAudioDecodes(() => {
    if (options.pollPressure) void check();
  });
  if (options.pollPressure) void check();
  const timer = options.pollPressure ? setInterval(() => void check(), POLL_INTERVAL_MS) : null;

  return () => {
    stopped = true;
    unsubscribe();
    unsubscribeDecodes();
    if (timer) clearInterval(timer);
  };
}
