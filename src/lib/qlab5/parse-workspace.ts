import { decodePlistRoot } from "./keyed-archiver";
import { parseFadeCueData } from "./parse-fade";
import type {
  QLabCue,
  QLabCueList,
  QLabCueType,
  QLabFileTarget,
  QLabGroupMode,
  QLabMidiData,
  QLabOscData,
  QLabWorkspace,
} from "./types";
import { QLAB5_WORKSPACE_EXTENSION } from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function coerceArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return [];
  const keys = Object.keys(record).filter((k) => /^\d+$/.test(k));
  if (keys.length === 0 || keys.length > 10_000) return [];
  const nums = keys.map(Number).sort((a, b) => a - b);
  if (nums[0] !== 0 || nums[nums.length - 1] !== nums.length - 1) return [];
  return nums.map((i) => record[String(i)]);
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asBool(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return "";
}

function pickNumber(record: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return asNumber(record[key], fallback);
    }
  }
  return fallback;
}

function pickBool(record: Record<string, unknown>, keys: string[], fallback = true): boolean {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return asBool(record[key], fallback);
    }
  }
  return fallback;
}

function normalizeCueType(value: unknown, className: string | null): QLabCueType {
  const raw = asString(value);
  if (raw) return raw;
  if (className) {
    const stripped = className.replace(/^F53/, "").replace(/Cue$/, "").replace(/Impl$/, "");
    if (stripped) return stripped;
  }
  return "Unknown";
}

function normalizeContinueMode(value: unknown): string {
  const raw = asString(value);
  if (raw) return raw;
  const n = asNumber(value, -1);
  if (n === 0) return "do_not_continue";
  if (n === 1) return "auto_continue";
  if (n === 2) return "auto_follow";
  return "do_not_continue";
}

function normalizeGroupMode(value: unknown): QLabGroupMode | null {
  const raw = asString(value);
  if (raw.includes("timeline") || raw === "2") return "timeline";
  if (raw.includes("start_all") || raw.includes("startAll") || raw === "0" || raw === "1") {
    return "start_all";
  }
  const n = asNumber(value, -1);
  if (n === 2) return "timeline";
  if (n === 0 || n === 1) return "start_all";
  return raw ? (raw as QLabGroupMode) : null;
}

function extractFilePath(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  if (!record) return "";
  return pickString(record, [
    "path",
    "filePath",
    "fileURLString",
    "NS.path",
    "NSPath",
    "relativePath",
    "absoluteString",
    "string",
  ]);
}

function parseFileTarget(record: Record<string, unknown>): QLabFileTarget | null {
  const direct = extractFilePath(
    record.fileTarget ??
      record.fileURL ??
      record.targetFile ??
      record.mediaFileURL ??
      record.movieFileURL,
  );
  if (direct) return { path: direct };
  return null;
}

function parseMidi(record: Record<string, unknown>): QLabMidiData | null {
  const messageType = pickString(record, ["midiMessageType", "messageType", "midiType", "command"]);
  if (!messageType && record.midiChannel === undefined && record.channel === undefined) {
    return null;
  }
  return {
    messageType: messageType || "note-on",
    channel: pickNumber(record, ["midiChannel", "channel"], 1),
    note: pickNumber(record, ["note", "midiNote"], undefined as unknown as number) || undefined,
    velocity:
      pickNumber(record, ["velocity", "midiVelocity"], undefined as unknown as number) || undefined,
    controller:
      pickNumber(record, ["controller", "controlNumber"], undefined as unknown as number) ||
      undefined,
    value:
      pickNumber(record, ["value", "controlValue"], undefined as unknown as number) || undefined,
    program:
      pickNumber(record, ["program", "programNumber"], undefined as unknown as number) || undefined,
  };
}

function parseOsc(record: Record<string, unknown>): QLabOscData | null {
  const address = pickString(record, ["oscAddress", "address", "customString"]);
  const host = pickString(record, ["destinationHost", "host", "ipAddress"]) || "127.0.0.1";
  const port = pickNumber(record, ["destinationPort", "port"], 53000);
  if (!address) return null;
  const args: QLabOscData["args"] = [];
  const rawArgs = record.oscArguments ?? record.arguments ?? record.args;
  if (Array.isArray(rawArgs)) {
    for (const item of rawArgs) {
      const argRecord = asRecord(item);
      if (!argRecord) continue;
      const type = pickString(argRecord, ["type", "oscType"]) || "string";
      const value = argRecord.value ?? argRecord.string ?? argRecord.number ?? "";
      args.push({ type, value: value as string | number | boolean });
    }
  }
  return { host, port, address, args };
}

function parseCueNode(node: unknown, seen: WeakSet<object>): QLabCue | null {
  const record = asRecord(node);
  if (!record) return null;
  if (seen.has(record)) return null;
  seen.add(record);

  const className = pickString(record, ["$classname"]) || null;
  const type = normalizeCueType(record.type ?? record.cueType ?? record.kind, className);
  const childrenRaw =
    record.cues ?? record.children ?? record.childCues ?? record.containedCues ?? record.subcues;
  const children: QLabCue[] = [];
  for (const child of coerceArray(childrenRaw)) {
    const parsed = parseCueNode(child, seen);
    if (parsed) children.push(parsed);
  }

  const targetUniqueId =
    pickString(record, [
      "targetID",
      "targetId",
      "targetUniqueID",
      "targetUniqueId",
      "cueTargetID",
      "cueTargetUniqueID",
      "cueTargetUniqueId",
    ]) || pickString(asRecord(record.cueTarget) ?? {}, ["uniqueID", "uniqueId", "id"]);

  const fadeData = type === "Fade" ? parseFadeCueData(record) : null;

  return {
    uniqueId: pickString(record, ["uniqueID", "uniqueId", "id", "UUID"]),
    number: pickString(record, ["number", "cueNumber", "qNumber"]),
    name: pickString(record, ["name", "cueName", "displayName"]) || type,
    type,
    armed: pickBool(record, ["armed", "isArmed"], true),
    flagged: pickBool(record, ["flagged", "isFlagged"], false),
    notes: pickString(record, ["notes", "memoText", "text"]),
    continueMode: normalizeContinueMode(record.continueMode ?? record.continuation),
    preWaitSec: pickNumber(record, ["preWait", "preWaitTime", "preWaitDuration"]),
    postWaitSec: pickNumber(record, ["postWait", "postWaitTime", "postWaitDuration"]),
    durationSec: pickNumber(record, ["duration", "waitDuration"]),
    fileTarget: parseFileTarget(record),
    targetUniqueId: targetUniqueId || null,
    groupMode: normalizeGroupMode(record.groupMode ?? record.mode ?? record.playbackMode),
    volume: pickNumber(record, ["level", "volume", "audioLevel"], 1),
    pan: pickNumber(record, ["pan", "audioPan"]),
    opacity: pickNumber(record, ["opacity", "videoOpacity"], 1),
    fadeInSec: pickNumber(record, ["fadeInTime", "fadeInDuration", "fadeIn"]),
    fadeOutSec: pickNumber(record, ["fadeOutTime", "fadeOutDuration", "fadeOut"]),
    inTimeSec: pickNumber(record, ["startTime", "inTime", "sliceStart"]),
    outTimeSec: pickNumber(record, ["endTime", "outTime", "sliceEnd"]),
    loop: pickBool(record, ["loop", "loops"], false),
    midi: parseMidi(record),
    osc: parseOsc(record),
    children,
    fadeTo: fadeData?.fadeTo ?? null,
    fadeFrom: fadeData?.fadeFrom ?? null,
    stopTargetWhenDone: fadeData?.stopTargetWhenDone ?? false,
    fadeOpacity: fadeData?.opacityFade ?? false,
  };
}

function isCueListRecord(record: Record<string, unknown>): boolean {
  const className = pickString(record, ["$classname"]).toLowerCase();
  const type = asString(record.type).toLowerCase();
  return (
    className.includes("cuelist") ||
    className.includes("cart") ||
    type === "cuelist" ||
    type === "cart" ||
    Array.isArray(record.cues) ||
    Array.isArray(record.children)
  );
}

function parseCueListNode(node: unknown, seen: WeakSet<object>): QLabCueList | null {
  const record = asRecord(node);
  if (!record) return null;
  if (seen.has(record)) return null;
  seen.add(record);

  const className = pickString(record, ["$classname"]).toLowerCase();
  const type = asString(record.type).toLowerCase();
  const isCart = className.includes("cart") || type === "cart";

  const cuesRaw = record.cues ?? record.children ?? record.childCues ?? [];
  const cues: QLabCue[] = [];
  for (const child of coerceArray(cuesRaw)) {
    const parsed = parseCueNode(child, new WeakSet());
    if (parsed) cues.push(parsed);
  }

  if (!isCueListRecord(record) && cues.length === 0) return null;

  return {
    uniqueId: pickString(record, ["uniqueID", "uniqueId", "id"]),
    name: pickString(record, ["name", "listName", "displayName"]) || "Cue List",
    isCart,
    cues,
  };
}

function normalizeCueListsFromRoot(record: Record<string, unknown>): QLabCueList[] {
  const raw = record.cueLists;
  const candidates = coerceArray(raw);
  const lists: QLabCueList[] = [];

  const tryParse = (node: unknown) => {
    const list = parseCueListNode(node, new WeakSet());
    if (list) lists.push(list);
  };

  if (candidates.length > 0) {
    for (const item of candidates) tryParse(item);
    if (lists.length > 0) return lists;
  }

  const single = asRecord(raw);
  if (single && (single.cues || isCueListRecord(single))) {
    tryParse(single);
    if (lists.length > 0) return lists;
  }

  return collectCueLists(record);
}

function collectCueLists(root: unknown): QLabCueList[] {
  const lists: QLabCueList[] = [];
  const seen = new WeakSet<object>();

  const visit = (node: unknown) => {
    const record = asRecord(node);
    if (!record || seen.has(record)) return;
    seen.add(record);

    const className = pickString(record, ["$classname"]).toLowerCase();
    const isListClass =
      className.includes("cuelist") ||
      className.includes("cart") ||
      className === "cuelist" ||
      (className.endsWith("list") && Array.isArray(record.cues));

    const list = parseCueListNode(record, new WeakSet());
    if (list && (list.cues.length > 0 || isListClass || isCueListRecord(record))) {
      lists.push(list);
    }

    for (const value of Object.values(record)) {
      for (const item of coerceArray(value)) visit(item);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const keys = Object.keys(value as object);
        if (!keys.every((k) => /^\d+$/.test(k))) visit(value);
      }
    }
  };

  visit(root);

  const rootRecord = asRecord(root);
  const explicit = coerceArray(rootRecord?.cueLists);
  if (explicit.length > 0) {
    const fromRoot: QLabCueList[] = [];
    for (const item of explicit) {
      const list = parseCueListNode(item, new WeakSet());
      if (list) fromRoot.push(list);
    }
    if (fromRoot.length > 0) return fromRoot;
  }

  return lists;
}

function workspaceNameFromPath(workspacePath: string): string {
  const parts = workspacePath.replace(/\\/g, "/").split("/");
  const file = parts[parts.length - 1] ?? "Imported Show";
  return file.toLowerCase().endsWith(QLAB5_WORKSPACE_EXTENSION)
    ? file.slice(0, -QLAB5_WORKSPACE_EXTENSION.length)
    : file.replace(/\.[^.]+$/, "");
}

export function parseDecodedWorkspaceRoot(
  root: unknown,
  workspacePath = "imported.qlab5",
): QLabWorkspace {
  const record = asRecord(root) ?? {};
  const cueLists = normalizeCueListsFromRoot(record);
  const uniqueLists = new Map<string, QLabCueList>();
  for (const list of cueLists) {
    const key = list.uniqueId || list.name;
    if (!uniqueLists.has(key)) uniqueLists.set(key, list);
  }
  const normalizedLists = [...uniqueLists.values()];
  if (normalizedLists.length === 0) {
    throw new Error("No cue lists found in QLab workspace");
  }

  const currentCueListId =
    pickString(record, ["currentCueListID", "currentCueListId", "selectedCueListID"]) || null;

  return {
    name: pickString(record, ["name", "workspaceName"]) || workspaceNameFromPath(workspacePath),
    uniqueId: pickString(record, ["uniqueID", "uniqueId", "workspaceID"]),
    currentCueListId,
    cueLists: normalizedLists,
    archiveVersion: pickString(record, ["archiveVersion", "version", "qlabVersion"]) || null,
  };
}

export function parseQlab5Workspace(
  bytes: Uint8Array,
  workspacePath = "imported.qlab5",
): QLabWorkspace {
  const root = decodePlistRoot(bytes);
  return parseDecodedWorkspaceRoot(root, workspacePath);
}

export function resolveQlab5Input(
  workspacePath: string,
  workspaceBytes: Uint8Array,
  baseDir?: string,
): { workspace: QLabWorkspace; mediaBaseDir: string | null } {
  const workspace = parseQlab5Workspace(workspaceBytes, workspacePath);
  const normalizedPath = workspacePath.replace(/\\/g, "/");
  const parentFromFile = normalizedPath.includes("/")
    ? normalizedPath.slice(0, normalizedPath.lastIndexOf("/"))
    : null;
  const mediaBaseDir = baseDir ?? parentFromFile;
  return { workspace, mediaBaseDir };
}
