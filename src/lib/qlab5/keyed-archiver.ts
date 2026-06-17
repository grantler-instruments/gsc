interface KeyedArchiverUid {
  UID: number;
}

function isUid(value: unknown): value is KeyedArchiverUid {
  return (
    typeof value === "object" &&
    value !== null &&
    "UID" in value &&
    typeof (value as KeyedArchiverUid).UID === "number"
  );
}

function classNameOf(classRef: unknown, objects: unknown[]): string | null {
  if (!isUid(classRef)) return null;
  const classDef = objects[classRef.UID];
  if (!classDef || typeof classDef !== "object") return null;
  const name = (classDef as Record<string, unknown>).$classname;
  return typeof name === "string" ? name : null;
}

function isByteDictionary(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const b0 = record["0"];
  const b1 = record["1"];
  const b2 = record["2"];
  const b3 = record["3"];
  if (b0 === 98 && b1 === 112 && b2 === 108 && b3 === 105) return true;
  const keys = Object.keys(record);
  if (keys.length < 8 || !keys.every((k) => /^\d+$/.test(k))) return false;
  return keys.every((k) => {
    const n = record[k];
    return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

function decodeNestedPlistIfPresent(value: unknown): unknown {
  const bytes = dataBytesFromValue(value);
  if (!bytes) return value;
  const nested = tryDecodeNestedPlist(bytes);
  return nested ?? value;
}

function resolveValue(
  value: unknown,
  objects: unknown[],
  stack: Set<number>,
  cache: Map<number, unknown>,
): unknown {
  if (isUid(value)) {
    return resolveObject(value.UID, objects, stack, cache);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, objects, stack, cache));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("$class" in record) {
      return resolveInstance(record, objects, stack, cache);
    }
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(record)) {
      out[key] = resolveValue(child, objects, stack, cache);
    }
    if (isByteDictionary(out)) return decodeNestedPlistIfPresent(out);
    return out;
  }
  return value;
}

function dataBytesFromValue(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return new Uint8Array(value);
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if ("NS.data" in record) return dataBytesFromValue(record["NS.data"]);
  const keys = Object.keys(record);
  if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
    const sorted = keys.map(Number).sort((a, b) => a - b);
    const bytes = new Uint8Array(sorted.length);
    for (let i = 0; i < sorted.length; i += 1) {
      bytes[i] = Number(record[String(sorted[i])]) & 0xff;
    }
    return bytes;
  }
  return null;
}

function tryDecodeNestedPlist(bytes: Uint8Array): unknown | null {
  if (bytes.length < 8) return null;
  const header = String.fromCharCode(...bytes.slice(0, 8));
  if (header !== "bplist00" && header !== "bplist15") return null;
  try {
    return decodePlistRoot(bytes);
  } catch {
    return null;
  }
}

function resolveNSData(
  record: Record<string, unknown>,
  objects: unknown[],
  stack: Set<number>,
  cache: Map<number, unknown>,
  className: string | null,
): unknown {
  const raw = record["NS.data"] ?? record.data;
  let bytes: Uint8Array | null = null;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(raw)) {
    bytes = new Uint8Array(raw);
  } else if (raw instanceof Uint8Array) {
    bytes = raw;
  } else {
    bytes = dataBytesFromValue(resolveValue(raw, objects, stack, cache));
  }
  if (!bytes) return { $classname: className ?? "NSData" };
  const nested = tryDecodeNestedPlist(bytes);
  if (nested !== null) return nested;
  return bytes;
}

function resolveNSDictionary(
  record: Record<string, unknown>,
  objects: unknown[],
  stack: Set<number>,
  cache: Map<number, unknown>,
  className: string | null,
): Record<string, unknown> {
  const keys = resolveValue(record["NS.keys"], objects, stack, cache);
  const values = resolveValue(record["NS.objects"], objects, stack, cache);
  const out: Record<string, unknown> = {};
  if (className) out.$classname = className;
  if (Array.isArray(keys) && Array.isArray(values)) {
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (typeof key === "string") out[key] = values[i];
    }
  }
  return out;
}

function resolveInstance(
  record: Record<string, unknown>,
  objects: unknown[],
  stack: Set<number>,
  cache: Map<number, unknown>,
): Record<string, unknown> {
  const className = classNameOf(record.$class, objects);
  if (className?.includes("Data") || "NS.data" in record || "data" in record) {
    const decoded = resolveNSData(record, objects, stack, cache, className);
    if (decoded !== null && typeof decoded === "object" && !Array.isArray(decoded)) {
      return decoded as Record<string, unknown>;
    }
    return decoded as Record<string, unknown>;
  }
  if (className?.includes("Array") && "NS.objects" in record && !("NS.keys" in record)) {
    const resolved = resolveValue(record["NS.objects"], objects, stack, cache);
    if (Array.isArray(resolved)) return resolved as unknown as Record<string, unknown>;
    if (isByteDictionary(resolved))
      return decodeNestedPlistIfPresent(resolved) as Record<string, unknown>;
    return resolved as Record<string, unknown>;
  }
  if (className?.includes("Dictionary") && "NS.keys" in record && "NS.objects" in record) {
    return resolveNSDictionary(record, objects, stack, cache, className);
  }
  const out: Record<string, unknown> = {};
  if (className) out.$classname = className;
  for (const [key, child] of Object.entries(record)) {
    if (key === "$class" || key === "NS.keys" || key === "NS.objects") continue;
    out[key] = resolveValue(child, objects, stack, cache);
  }
  return out;
}

function resolveObject(
  index: number,
  objects: unknown[],
  stack: Set<number>,
  cache: Map<number, unknown>,
): unknown {
  if (cache.has(index)) return cache.get(index);
  if (stack.has(index)) return null;

  stack.add(index);
  try {
    const value = objects[index];
    if (value === "$null" || value === null || value === undefined) {
      cache.set(index, null);
      return null;
    }
    if (isUid(value)) {
      const resolved = resolveObject(value.UID, objects, stack, cache);
      cache.set(index, resolved);
      return resolved;
    }
    if (Array.isArray(value)) {
      const resolved = value.map((item) => resolveValue(item, objects, stack, cache));
      cache.set(index, resolved);
      return resolved;
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      if ("$classname" in record && !("$class" in record)) {
        const resolved = { ...record };
        cache.set(index, resolved);
        return resolved;
      }
      if ("$class" in record) {
        const resolved = resolveInstance(record, objects, stack, cache);
        cache.set(index, resolved);
        return resolved;
      }
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(record)) {
        out[key] = resolveValue(child, objects, stack, cache);
      }
      const resolved = isByteDictionary(out) ? decodeNestedPlistIfPresent(out) : out;
      cache.set(index, resolved);
      return resolved;
    }
    cache.set(index, value);
    return value;
  } finally {
    stack.delete(index);
  }
}

export function decodeKeyedArchiver(plist: Record<string, unknown>): unknown {
  const objects = plist.$objects;
  if (!Array.isArray(objects)) {
    throw new Error("Invalid keyed archive: missing $objects");
  }
  const top = plist.$top;
  if (!top || typeof top !== "object") {
    throw new Error("Invalid keyed archive: missing $top");
  }
  const topRecord = top as Record<string, unknown>;
  const rootRef = topRecord.root ?? topRecord.NSKeyedArchiveRootObjectKey;
  if (!isUid(rootRef)) {
    throw new Error("Invalid keyed archive: missing root UID");
  }
  return resolveObject(rootRef.UID, objects, new Set(), new Map());
}

import { isKeyedArchiverPlist, parseBinaryPlist } from "./bplist";

export function decodePlistRoot(bytes: Uint8Array): unknown {
  const plist = parseBinaryPlist(bytes);
  if (isKeyedArchiverPlist(plist)) {
    return decodeKeyedArchiver(plist);
  }
  return plist;
}
