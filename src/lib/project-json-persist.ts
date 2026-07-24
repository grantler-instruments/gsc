import type { ProjectSnapshot } from "../types/cue";
import {
  PROJECT_JSON,
  PROJECT_JSON_BAK,
  PROJECT_JSON_BAK_TMP,
  PROJECT_JSON_TMP,
} from "./project-paths";

export interface ProjectJsonFsOps {
  exists: (path: string) => Promise<boolean>;
  copyFile: (from: string, to: string) => Promise<void>;
  rename: (from: string, to: string) => Promise<void>;
  writeTextFile: (path: string, contents: string) => Promise<void>;
  readTextFile: (path: string) => Promise<string>;
  remove?: (path: string) => Promise<void>;
}

function joinUnderRoot(rootDir: string, leaf: string): string {
  const sep = rootDir.includes("\\") ? "\\" : "/";
  return `${rootDir.replace(/[/\\]+$/, "")}${sep}${leaf}`;
}

export function projectJsonPaths(rootDir: string): {
  primary: string;
  bak: string;
  tmp: string;
  bakTmp: string;
} {
  return {
    primary: joinUnderRoot(rootDir, PROJECT_JSON),
    bak: joinUnderRoot(rootDir, PROJECT_JSON_BAK),
    tmp: joinUnderRoot(rootDir, PROJECT_JSON_TMP),
    bakTmp: joinUnderRoot(rootDir, PROJECT_JSON_BAK_TMP),
  };
}

async function bestEffortRemove(
  path: string,
  remove?: (path: string) => Promise<void>,
): Promise<void> {
  if (!remove) return;
  try {
    await remove(path);
  } catch {
    /* ignore cleanup failures */
  }
}

/**
 * Write project.json safely: refresh rolling bak from the current primary, then
 * replace primary via temp + rename so a crash never leaves a truncated JSON.
 */
export async function writeProjectJsonSafely(
  rootDir: string,
  contents: string,
  ops: ProjectJsonFsOps,
): Promise<void> {
  const { primary, bak, tmp, bakTmp } = projectJsonPaths(rootDir);

  if (await ops.exists(primary)) {
    await ops.copyFile(primary, bakTmp);
    await ops.rename(bakTmp, bak);
  }

  await ops.writeTextFile(tmp, contents);
  await ops.rename(tmp, primary);

  await bestEffortRemove(tmp, ops.remove);
  await bestEffortRemove(bakTmp, ops.remove);
}

export type ProjectJsonSource = "primary" | "backup";

export interface ReadProjectJsonResult {
  text: string;
  source: ProjectJsonSource;
  snap: ProjectSnapshot;
}

function tryParseV2(text: string): ProjectSnapshot | null {
  try {
    const snap = JSON.parse(text) as ProjectSnapshot;
    if (snap.version !== 2) return null;
    return snap;
  } catch {
    return null;
  }
}

/** Read primary project.json, falling back to project.json.bak when corrupt/missing. */
export async function readProjectJsonWithBackup(
  rootDir: string,
  ops: Pick<ProjectJsonFsOps, "exists" | "readTextFile">,
): Promise<ReadProjectJsonResult | null> {
  const { primary, bak } = projectJsonPaths(rootDir);

  if (await ops.exists(primary)) {
    try {
      const text = await ops.readTextFile(primary);
      const snap = tryParseV2(text);
      if (snap) return { text, source: "primary", snap };
    } catch {
      /* try backup */
    }
  }

  if (await ops.exists(bak)) {
    try {
      const text = await ops.readTextFile(bak);
      const snap = tryParseV2(text);
      if (snap) return { text, source: "backup", snap };
    } catch {
      /* fall through */
    }
  }

  return null;
}

/** True when either the primary or bak project.json exists on disk. */
export async function projectJsonOrBakExists(
  rootDir: string,
  exists: (path: string) => Promise<boolean>,
): Promise<boolean> {
  const { primary, bak } = projectJsonPaths(rootDir);
  return (await exists(primary)) || (await exists(bak));
}
