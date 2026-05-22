import type { OscArg, OscCueData } from "../types/cue";

export function defaultOscCueData(): OscCueData {
  return {
    host: "127.0.0.1",
    port: 8000,
    address: "/cue",
    args: [],
  };
}

export function clampOscPort(v: number): number {
  return Math.max(1, Math.min(65535, Math.round(v)));
}

function normalizeQuotes(text: string): string {
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

export function normalizeOscArg(value: unknown): OscArg | null {
  if (typeof value === "boolean") return { type: "bool", value };
  if (typeof value === "string") return { type: "string", value };
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value)) return { type: "int", value };
    return { type: "float", value };
  }
  return null;
}

function isTypedOscArg(value: unknown): value is OscArg {
  if (!value || typeof value !== "object") return false;
  const arg = value as Partial<OscArg>;
  return (
    (arg.type === "int" ||
      arg.type === "float" ||
      arg.type === "string" ||
      arg.type === "bool") &&
    arg.value !== undefined
  );
}

/** Coerce stored/persisted args into typed OSC arguments. */
export function normalizeOscArgs(args: unknown): OscArg[] {
  if (!Array.isArray(args)) return [];
  const out: OscArg[] = [];
  for (const item of args) {
    if (isTypedOscArg(item)) {
      out.push(item);
      continue;
    }
    const normalized = normalizeOscArg(item);
    if (normalized) out.push(normalized);
  }
  return out;
}

function parseOscArgArray(items: unknown[]): OscArg[] | null {
  const args: OscArg[] = [];
  for (const item of items) {
    if (isTypedOscArg(item)) {
      args.push(item);
      continue;
    }
    const arg = normalizeOscArg(item);
    if (!arg) return null;
    args.push(arg);
  }
  return args;
}

function tryParseIncompleteJsonArray(text: string): OscArg[] | null {
  if (!text.startsWith("[") || text.endsWith("]") || text === "[") {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(`${text}]`);
    if (Array.isArray(parsed)) return parseOscArgArray(parsed);
  } catch {
    /* keep typing */
  }
  return null;
}

function parseOscToken(token: string): OscArg | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return { type: "string", value: trimmed.slice(1, -1) };
  }
  if (trimmed === "true") return { type: "bool", value: true };
  if (trimmed === "false") return { type: "bool", value: false };
  if (/^-?\d+$/.test(trimmed)) return { type: "int", value: Number(trimmed) };
  if (/^-?\d*\.\d+$/.test(trimmed)) {
    return { type: "float", value: Number(trimmed) };
  }
  return { type: "string", value: trimmed };
}

function splitCommaSeparated(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ",") {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }

  parts.push(current);
  return parts;
}

/** Parse the inspector args field into typed OSC arguments. */
export function parseOscArgsText(text: string): OscArg[] | null {
  const trimmed = normalizeQuotes(text.trim());
  if (!trimmed) return [];

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parseOscArgArray(parsed);
    const single = normalizeOscArg(parsed);
    return single ? [single] : null;
  } catch {
    const incomplete = tryParseIncompleteJsonArray(trimmed);
    if (incomplete !== null) return incomplete;

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) return null;
    if (
      (trimmed.startsWith('"') && !trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && !trimmed.endsWith("'"))
    ) {
      return null;
    }

    if (!trimmed.includes(",")) {
      const single = parseOscToken(trimmed);
      return single ? [single] : null;
    }

    const args: OscArg[] = [];
    for (const part of splitCommaSeparated(trimmed)) {
      const arg = parseOscToken(part);
      if (!arg) return null;
      args.push(arg);
    }
    return args;
  }
}

export function formatOscArgsText(args: OscArg[]): string {
  if (args.length === 0) return "";
  return JSON.stringify(args.map((arg) => arg.value));
}

function formatOscArgValue(arg: OscArg): string {
  if (arg.type === "string") return `"${arg.value}"`;
  return String(arg.value);
}

export function formatOscCue(data: OscCueData): string {
  const args =
    data.args.length > 0
      ? ` ${data.args.map(formatOscArgValue).join(", ")}`
      : "";
  return `${data.host}:${data.port} ${data.address}${args}`;
}

/** Wire format for the Tauri invoke — keeps type tags explicit. */
export function serializeOscArgsForInvoke(
  args: OscArg[],
): Array<{ type: OscArg["type"]; value: OscArg["value"] }> {
  return normalizeOscArgs(args).map((arg) => ({ type: arg.type, value: arg.value }));
}
