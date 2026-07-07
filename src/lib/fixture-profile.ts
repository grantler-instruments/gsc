import { strFromU8, strToU8, unzipSync, type Zippable, zipSync } from "fflate";
import { t } from "../i18n/t";
import type { Fixture } from "../types/fixture";
import type { FixturePlot } from "../types/fixture-plot";
import { normalizePath, vfsHas, vfsPut } from "../vfs/engine";
import { ensureFixturePlot, normalizeFixturePlot } from "./fixture-plot";
import {
  fixtureFitsInUniverse,
  getFixtureConflicts,
  normalizeFixtures,
  suggestNextFixtureAddress,
} from "./fixtures";
import { collectOflPaths } from "./ofl/import-ofl";
import {
  assetRelativePath,
  isAssetsRelativePath,
  virtualPathFromRelativeAssetFile,
} from "./project-paths";
import { randomId } from "./random-id";

export const FIXTURES_PROFILE_JSON = "fixtures.json";
export const FIXTURES_PROFILE_EXTENSION = ".gsc-fixtures.zip";

export interface FixturesProfileSnapshotV1 {
  version: 1;
  fixtures: Fixture[];
}

export interface FixturesProfileSnapshotV2 {
  version: 2;
  name?: string;
  fixtures: Fixture[];
  fixturePlot?: FixturePlot;
}

export type FixturesProfileSnapshot = FixturesProfileSnapshotV1 | FixturesProfileSnapshotV2;

export interface ParsedFixturesProfile {
  version: 1 | 2;
  name?: string;
  fixtures: Fixture[];
  fixturePlot?: FixturePlot;
}

export type FixturesProfileImportMode = "merge" | "replace";

export interface FixtureProfileFile {
  path: string;
  data: Uint8Array;
}

export function collectFixtureProfilePaths(
  fixtures: Fixture[],
  fixturePlot?: FixturePlot,
): string[] {
  const paths = new Set(collectOflPaths(fixtures));
  const background = fixturePlot?.backgroundAssetPath?.trim();
  if (background) {
    paths.add(normalizePath(background));
  }
  return [...paths];
}

export async function buildFixturesProfileZip(
  fixtures: Fixture[],
  fixturePlot: FixturePlot | undefined,
  readBlob: (path: string) => Blob | undefined | Promise<Blob | undefined>,
  options: { name?: string } = {},
): Promise<{ zip: Uint8Array; missing: string[] }> {
  const snapshot: FixturesProfileSnapshotV2 = {
    version: 2,
    name: options.name?.trim() || undefined,
    fixtures: normalizeFixtures(fixtures),
    fixturePlot: normalizeFixturePlot(fixturePlot, fixtures),
  };
  const missing: string[] = [];
  const zipEntries: Zippable = {
    [FIXTURES_PROFILE_JSON]: strToU8(JSON.stringify(snapshot, null, 2)),
  };

  for (const virtualPath of collectFixtureProfilePaths(fixtures, fixturePlot)) {
    const blob = await readBlob(virtualPath);
    if (!blob) {
      missing.push(virtualPath);
      continue;
    }
    zipEntries[assetRelativePath(virtualPath)] = new Uint8Array(await blob.arrayBuffer());
  }

  return { zip: zipSync(zipEntries), missing };
}

function parseFixturesProfileSnapshot(raw: unknown): ParsedFixturesProfile {
  if (!raw || typeof raw !== "object") {
    throw new Error(t("notification.invalidFixturesProfile"));
  }

  const snapshot = raw as Partial<FixturesProfileSnapshot>;
  if (!Array.isArray(snapshot.fixtures)) {
    throw new Error(t("notification.invalidFixturesProfile"));
  }

  const fixtures = normalizeFixtures(snapshot.fixtures);
  if (snapshot.version === 2) {
    return {
      version: 2,
      name: typeof snapshot.name === "string" ? snapshot.name.trim() || undefined : undefined,
      fixtures,
      fixturePlot: normalizeFixturePlot(snapshot.fixturePlot, fixtures),
    };
  }

  if (snapshot.version === 1) {
    return {
      version: 1,
      fixtures,
    };
  }

  throw new Error(t("notification.invalidFixturesProfile"));
}

export function parseFixturesProfileZip(data: Uint8Array): {
  snapshot: ParsedFixturesProfile;
  profiles: FixtureProfileFile[];
} {
  const unzipped = unzipSync(data);
  let snapshot: ParsedFixturesProfile | undefined;
  const profiles: FixtureProfileFile[] = [];

  for (const [name, bytes] of Object.entries(unzipped)) {
    if (name === FIXTURES_PROFILE_JSON || name.endsWith(`/${FIXTURES_PROFILE_JSON}`)) {
      snapshot = parseFixturesProfileSnapshot(JSON.parse(strFromU8(bytes)));
      continue;
    }
    if (isAssetsRelativePath(name) && !name.endsWith("/")) {
      profiles.push({
        path: virtualPathFromRelativeAssetFile(name),
        data: bytes,
      });
    }
  }

  if (!snapshot) {
    throw new Error(t("notification.invalidFixturesProfile"));
  }

  return { snapshot, profiles };
}

function uniqueProfilePath(desiredPath: string, taken: Set<string>): string {
  const normalized = normalizePath(desiredPath);
  if (!taken.has(normalized)) {
    taken.add(normalized);
    return normalized;
  }

  const parts = normalized.split("/");
  const fileName = parts.pop() ?? "profile";
  const dir = parts.join("/");
  const dot = fileName.lastIndexOf(".");
  const stem = dot >= 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot >= 0 ? fileName.slice(dot) : "";

  let index = 2;
  while (true) {
    const candidate = normalizePath(`${dir}/${stem}_${index}${ext}`);
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
    index += 1;
  }
}

function profileBlobType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/json";
}

function remapFixtureProfilePaths(
  fixture: Fixture,
  pathMap: Map<string, string>,
  idMap: Map<string, string>,
): Fixture {
  const oldId = fixture.id;
  const remapped: Fixture = {
    ...fixture,
    id: randomId(),
  };
  idMap.set(oldId, remapped.id);

  if (remapped.ofl && pathMap.has(remapped.ofl.filePath)) {
    const mappedPath = pathMap.get(remapped.ofl.filePath);
    if (!mappedPath) return remapped;
    remapped.ofl = {
      ...remapped.ofl,
      filePath: mappedPath,
    };
  }

  return remapped;
}

export function resolveImportedFixtureAddresses(
  existingFixtures: Fixture[],
  importedFixtures: Fixture[],
): Fixture[] {
  const placed = [...existingFixtures];
  const resolved: Fixture[] = [];

  for (const fixture of importedFixtures) {
    const conflicts = getFixtureConflicts(fixture, placed);
    const adjusted =
      conflicts.length === 0 && fixtureFitsInUniverse(fixture)
        ? fixture
        : {
            ...fixture,
            startAddress: suggestNextFixtureAddress(placed, fixture.universe),
          };
    placed.push(adjusted);
    resolved.push(adjusted);
  }

  return resolved;
}

export function remapImportedFixturePlot(
  plot: FixturePlot | undefined,
  idMap: Map<string, string>,
  pathMap: Map<string, string>,
): FixturePlot | undefined {
  if (!plot) return undefined;

  const entries = plot.entries
    .map((entry) => {
      const fixtureId = idMap.get(entry.fixtureId);
      if (!fixtureId) return null;
      return { ...entry, fixtureId };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const backgroundAssetPath = plot.backgroundAssetPath
    ? (pathMap.get(plot.backgroundAssetPath) ?? plot.backgroundAssetPath)
    : undefined;

  return { entries, backgroundAssetPath };
}

export function mergeImportedFixturePlots(
  existingPlot: FixturePlot,
  importedPlot: FixturePlot | undefined,
  fixtures: Fixture[],
): FixturePlot {
  if (!importedPlot) {
    return ensureFixturePlot(existingPlot, fixtures);
  }

  const existingEntries = existingPlot.entries.filter((entry) =>
    fixtures.some((fixture) => fixture.id === entry.fixtureId),
  );
  const existingIds = new Set(existingEntries.map((entry) => entry.fixtureId));
  const importedEntries = importedPlot.entries.filter((entry) => !existingIds.has(entry.fixtureId));
  const backgroundAssetPath = existingPlot.backgroundAssetPath ?? importedPlot.backgroundAssetPath;

  return normalizeFixturePlot(
    {
      backgroundAssetPath,
      entries: [...existingEntries, ...importedEntries],
    },
    fixtures,
  );
}

export function mergeImportedFixtures(
  existingFixtures: Fixture[],
  importedFixtures: Fixture[],
): Fixture[] {
  return [
    ...existingFixtures,
    ...resolveImportedFixtureAddresses(existingFixtures, importedFixtures),
  ];
}

export function prepareFixturesProfileImport(
  snapshot: ParsedFixturesProfile,
  profiles: FixtureProfileFile[],
  existingFixtures: Fixture[],
  existingProfilePaths: Iterable<string> = [],
  mode: FixturesProfileImportMode = "merge",
): {
  fixtures: Fixture[];
  profiles: Array<{ path: string; blob: Blob }>;
  fixturePlot?: FixturePlot;
} {
  const takenPaths = new Set(existingProfilePaths);
  const pathMap = new Map<string, string>();
  const idMap = new Map<string, string>();

  for (const profile of profiles) {
    pathMap.set(profile.path, uniqueProfilePath(profile.path, takenPaths));
  }

  for (const fixture of snapshot.fixtures) {
    if (fixture.ofl?.filePath && !pathMap.has(fixture.ofl.filePath)) {
      pathMap.set(fixture.ofl.filePath, uniqueProfilePath(fixture.ofl.filePath, takenPaths));
    }
  }

  const backgroundPath = snapshot.fixturePlot?.backgroundAssetPath?.trim();
  if (backgroundPath && !pathMap.has(backgroundPath)) {
    pathMap.set(backgroundPath, uniqueProfilePath(backgroundPath, takenPaths));
  }

  const remappedFixtures = snapshot.fixtures.map((fixture) =>
    remapFixtureProfilePaths(fixture, pathMap, idMap),
  );

  const importedProfiles = profiles
    .map((profile) => {
      const path = pathMap.get(profile.path);
      if (!path) return null;
      return {
        path,
        blob: new Blob([profile.data], { type: profileBlobType(path) }),
      };
    })
    .filter((entry): entry is { path: string; blob: Blob } => entry !== null);

  const addressBase = mode === "replace" ? [] : existingFixtures;
  const fixturePlot = remapImportedFixturePlot(snapshot.fixturePlot, idMap, pathMap);

  return {
    fixtures: resolveImportedFixtureAddresses(addressBase, remappedFixtures),
    profiles: importedProfiles,
    fixturePlot,
  };
}

export function downloadFixturesProfile(zip: Uint8Array, baseName = "fixtures"): void {
  const blob = new Blob([zip], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeBase = baseName.replace(/[^\w.-]+/g, "_") || "fixtures";
  a.href = url;
  a.download = `${safeBase}${FIXTURES_PROFILE_EXTENSION}`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function hydrateFixtureProfiles(
  profiles: Array<{ path: string; blob: Blob }>,
): Promise<void> {
  for (const { path, blob } of profiles) {
    if (!vfsHas(path)) {
      vfsPut(path, blob);
    }
  }

  const { getPlatform } = await import("../platform");
  if (getPlatform() === "tauri") {
    const { syncImportedAssetToDisk } = await import("../platform/project-storage.tauri");
    for (const { path, blob } of profiles) {
      await syncImportedAssetToDisk(path, blob);
    }
  }

  const { tryGetActiveProjectId } = await import("./active-project-id");
  const { cacheAsset } = await import("./asset-cache");
  const projectId = tryGetActiveProjectId();
  if (projectId) {
    for (const { path, blob } of profiles) {
      await cacheAsset(projectId, path, blob);
    }
  }
}
