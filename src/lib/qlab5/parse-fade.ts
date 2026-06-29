function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function coerceArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return [];
  const keys = Object.keys(record).filter((k) => /^\d+$/.test(k));
  if (keys.length === 0) return [];
  const nums = keys.map(Number).sort((a, b) => a - b);
  if (nums[0] !== 0 || nums[nums.length - 1] !== nums.length - 1) return [];
  return nums.map((i) => record[String(i)]);
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

export interface QLabFadeData {
  fadeTo: number;
  fadeFrom: number | null;
  stopTargetWhenDone: boolean;
  opacityFade: boolean;
}

function isFadeValueEntry(record: Record<string, unknown>): boolean {
  const className = String(record.$classname ?? "");
  return className.includes("FadeValueEntry") || ("startValue" in record && "endValue" in record);
}

function collectFadeValueEntries(
  node: unknown,
  out: Array<{ start: number; end: number; row: number; column: number }>,
): void {
  const record = asRecord(node);
  if (!record) return;

  if (isFadeValueEntry(record)) {
    out.push({
      start: asNumber(record.startValue, 0),
      end: asNumber(record.endValue, 0),
      row: asNumber(record.row, 0),
      column: asNumber(record.column, 0),
    });
    return;
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      collectFadeValueEntries(value, out);
    }
  }
}

function shapeEndLevel(
  shapes: Record<string, unknown> | null,
  which: "up" | "down",
): number | null {
  if (!shapes) return null;
  const shape = asRecord(which === "up" ? shapes.upShape : shapes.downShape);
  if (!shape) return null;
  const entries = coerceArray(shape.shapeEntries);
  if (entries.length === 0) return null;
  const last = asRecord(entries[entries.length - 1]);
  if (!last) return null;
  return asNumber(last.v, NaN);
}

function levelFromPathPoints(path: Record<string, unknown> | null): number | null {
  if (!path) return null;
  const points = coerceArray(path.points);
  if (points.length === 0) return null;
  const last = asRecord(points[points.length - 1]);
  if (!last) return null;
  for (const key of ["y", "v", "level", "value"]) {
    if (last[key] !== undefined) {
      const n = asNumber(last[key], NaN);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function pickMainLevelEntry(
  entries: Array<{ start: number; end: number; row: number; column: number }>,
): { start: number; end: number } | null {
  if (entries.length === 0) return null;
  const main =
    entries.find((entry) => entry.row === 0 && entry.column === 0) ??
    entries.find((entry) => entry.row === 0) ??
    entries[0];
  return main ?? null;
}

function inferLevelFromShapes(
  fadeObj: Record<string, unknown>,
  stopTargetWhenDone: boolean,
): { fadeTo: number; fadeFrom: number | null } {
  const shapes = asRecord(fadeObj.shapes);
  const upEnd = shapeEndLevel(shapes, "up");
  const downEnd = shapeEndLevel(shapes, "down");

  if (stopTargetWhenDone && downEnd !== null && Number.isFinite(downEnd)) {
    return { fadeTo: downEnd, fadeFrom: null };
  }

  if (upEnd !== null && downEnd !== null) {
    return { fadeTo: downEnd, fadeFrom: null };
  }

  if (upEnd !== null && Number.isFinite(upEnd)) {
    return { fadeTo: upEnd, fadeFrom: null };
  }

  return { fadeTo: 0, fadeFrom: null };
}

export function isFadeCueRecord(record: Record<string, unknown>): boolean {
  const className = String(record.$classname ?? "").toLowerCase();
  const type = String(record.type ?? "");
  return className.includes("fadecue") || type === "Fade";
}

export function parseFadeCueData(record: Record<string, unknown>): QLabFadeData | null {
  if (!isFadeCueRecord(record)) return null;

  const fadeObj = asRecord(record.fade) ?? {};
  const entries: Array<{ start: number; end: number; row: number; column: number }> = [];
  collectFadeValueEntries(fadeObj.entries, entries);
  collectFadeValueEntries(record.audioObjectLevelsFades, entries);
  collectFadeValueEntries(record.audioObjectLevels, entries);
  collectFadeValueEntries(record.audioObjectPathFades, entries);
  collectFadeValueEntries(fadeObj, entries);

  const stopTargetWhenDone =
    asBool(record.stopTargetWhenDone, false) || asBool(fadeObj.stopTargetWhenDone, false);
  const opacityFade = asBool(record.doOpacity, false);

  const main = pickMainLevelEntry(entries);
  if (main) {
    return {
      fadeTo: main.end,
      fadeFrom: main.start !== main.end ? main.start : null,
      stopTargetWhenDone,
      opacityFade,
    };
  }

  const pathLevel = levelFromPathPoints(asRecord(fadeObj.path));
  if (pathLevel !== null) {
    return {
      fadeTo: pathLevel,
      fadeFrom: null,
      stopTargetWhenDone,
      opacityFade,
    };
  }

  const inferred = inferLevelFromShapes(fadeObj, stopTargetWhenDone);
  return {
    fadeTo: inferred.fadeTo,
    fadeFrom: inferred.fadeFrom,
    stopTargetWhenDone,
    opacityFade,
  };
}
