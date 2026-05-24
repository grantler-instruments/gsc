import { VFS_ASSETS_ROOT } from "../project-paths";
import { getPlatform } from "../../platform";
import { joinPath, normalizePath, vfsHas, vfsPut } from "../../vfs/engine";
import { parseOflFixtureJson } from "./client";
import type { OflFixtureSummary } from "./types";

const OFL_FIXTURES_DIR = `${VFS_ASSETS_ROOT}/fixtures/ofl`;

export interface ImportedOflFile {
  path: string;
  fileName: string;
  summary: OflFixtureSummary;
}

function uniqueOflPath(manufacturerKey: string, fixtureKey: string, taken: Set<string>): string {
  let candidate = normalizePath(
    joinPath(joinPath(OFL_FIXTURES_DIR, manufacturerKey), `${fixtureKey}.json`),
  );
  if (!taken.has(candidate)) return candidate;

  let index = 2;
  while (taken.has(candidate)) {
    candidate = normalizePath(
      joinPath(joinPath(OFL_FIXTURES_DIR, manufacturerKey), `${fixtureKey}_${index}.json`),
    );
    index += 1;
  }
  return candidate;
}

export async function importOflFixtureJson(
  manufacturerKey: string,
  manufacturerName: string,
  fixtureKey: string,
  raw: unknown,
  existingPaths: Iterable<string> = [],
): Promise<ImportedOflFile> {
  const summary = parseOflFixtureJson(manufacturerKey, manufacturerName, fixtureKey, raw);
  const taken = new Set(existingPaths);
  const path = uniqueOflPath(manufacturerKey, fixtureKey, taken);
  const fileName = `${fixtureKey}.json`;
  const blob = new Blob([JSON.stringify(raw, null, 2)], {
    type: "application/json",
  });

  if (!vfsHas(path)) {
    vfsPut(path, blob);
  }

  if (getPlatform() === "tauri") {
    const { syncImportedAssetToDisk } = await import("../../platform/project-storage.tauri");
    await syncImportedAssetToDisk(path, blob);
  }

  return { path, fileName, summary };
}

export function collectOflPaths(fixtures: Array<{ ofl?: { filePath: string } }>): string[] {
  const paths = new Set<string>();
  for (const fixture of fixtures) {
    if (fixture.ofl?.filePath) {
      paths.add(normalizePath(fixture.ofl.filePath));
    }
  }
  return [...paths];
}
