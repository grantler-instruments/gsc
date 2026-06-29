import bplistParser from "bplist-parser";
import { Buffer as BrowserBuffer } from "buffer/";

// QLab workspaces embed large nested cue-list plists (100k+ objects).
const parserWithLimits = bplistParser as typeof bplistParser & {
  maxObjectCount?: number;
  maxObjectSize?: number;
};
parserWithLimits.maxObjectCount = 2_000_000;
parserWithLimits.maxObjectSize = 200 * 1000 * 1000;

export function parseBinaryPlist(bytes: Uint8Array): unknown {
  const globalWithBuffer = globalThis as { Buffer?: unknown };
  if (!globalWithBuffer.Buffer) {
    globalWithBuffer.Buffer = BrowserBuffer;
  }
  const results = bplistParser.parseBuffer(BrowserBuffer.from(bytes) as unknown as Buffer);
  if (!results?.length) {
    throw new Error("Empty or invalid binary plist");
  }
  return results[0];
}

export function isKeyedArchiverPlist(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.$archiver === "NSKeyedArchiver" && Array.isArray(record.$objects);
}
