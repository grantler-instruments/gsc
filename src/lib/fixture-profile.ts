import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import {
  fixtureFitsInUniverse,
  getFixtureConflicts,
  normalizeFixtures,
  suggestNextFixtureAddress,
} from "./fixtures";
import { collectOflPaths } from "./ofl/import-ofl";
import { assetRelativePath } from "./project-paths";
import type { Fixture } from "../types/fixture";
import { normalizePath, vfsHas, vfsPut } from "../vfs/engine";

export const FIXTURES_PROFILE_JSON = "fixtures.json";
export const FIXTURES_PROFILE_EXTENSION = ".gsc-fixtures.zip";

export interface FixturesProfileSnapshot {
  version: 1;
  fixtures: Fixture[];
}

export interface FixtureProfileFile {
  path: string;
  data: Uint8Array;
}

export function collectFixtureProfilePaths(fixtures: Fixture[]): string[] {
  return collectOflPaths(fixtures);
}

export async function buildFixturesProfileZip(
  fixtures: Fixture[],
  readBlob: (
    path: string,
  ) => Blob | undefined | Promise<Blob | undefined>,
): Promise<{ zip: Uint8Array; missing: string[] }> {
  const snapshot: FixturesProfileSnapshot = {
    version: 1,
    fixtures: normalizeFixtures(fixtures),
  };
  const missing: string[] = [];
  const zipEntries: Zippable = {
    [FIXTURES_PROFILE_JSON]: strToU8(JSON.stringify(snapshot, null, 2)),
  };

  for (const virtualPath of collectFixtureProfilePaths(fixtures)) {
    const blob = await readBlob(virtualPath);
    if (!blob) {
      missing.push(virtualPath);
      continue;
    }
    zipEntries[assetRelativePath(virtualPath)] = new Uint8Array(
      await blob.arrayBuffer(),
    );
  }

  return { zip: zipSync(zipEntries), missing };
}

export function parseFixturesProfileZip(data: Uint8Array): {
  snapshot: FixturesProfileSnapshot;
  profiles: FixtureProfileFile[];
} {
  const unzipped = unzipSync(data);
  let snapshot: FixturesProfileSnapshot | undefined;
  const profiles: FixtureProfileFile[] = [];

  for (const [name, bytes] of Object.entries(unzipped)) {
    if (name === FIXTURES_PROFILE_JSON || name.endsWith(`/${FIXTURES_PROFILE_JSON}`)) {
      snapshot = JSON.parse(strFromU8(bytes)) as FixturesProfileSnapshot;
      continue;
    }
    if (name.startsWith("project/fixtures/") && !name.endsWith("/")) {
      profiles.push({
        path: normalizePath(`/${name}`),
        data: bytes,
      });
    }
  }

  if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.fixtures)) {
    throw new Error("Invalid fixtures profile: missing fixtures.json");
  }

  return {
    snapshot: {
      version: 1,
      fixtures: normalizeFixtures(snapshot.fixtures),
    },
    profiles,
  };
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

function remapFixtureProfilePaths(
  fixture: Fixture,
  pathMap: Map<string, string>,
): Fixture {
  const remapped: Fixture = {
    ...fixture,
    id: crypto.randomUUID(),
  };

  if (remapped.ofl && pathMap.has(remapped.ofl.filePath)) {
    remapped.ofl = {
      ...remapped.ofl,
      filePath: pathMap.get(remapped.ofl.filePath)!,
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
  snapshot: FixturesProfileSnapshot,
  profiles: FixtureProfileFile[],
  existingFixtures: Fixture[],
  existingProfilePaths: Iterable<string> = [],
): {
  fixtures: Fixture[];
  profiles: Array<{ path: string; blob: Blob }>;
} {
  const takenPaths = new Set(existingProfilePaths);
  const pathMap = new Map<string, string>();

  for (const profile of profiles) {
    pathMap.set(
      profile.path,
      uniqueProfilePath(profile.path, takenPaths),
    );
  }

  for (const fixture of snapshot.fixtures) {
    if (fixture.ofl?.filePath && !pathMap.has(fixture.ofl.filePath)) {
      pathMap.set(
        fixture.ofl.filePath,
        uniqueProfilePath(fixture.ofl.filePath, takenPaths),
      );
    }
  }

  const remappedFixtures = snapshot.fixtures.map((fixture) =>
    remapFixtureProfilePaths(fixture, pathMap),
  );

  const importedProfiles = profiles
    .map((profile) => {
      const path = pathMap.get(profile.path);
      if (!path) return null;
      return {
        path,
        blob: new Blob([profile.data], { type: "application/json" }),
      };
    })
    .filter((entry): entry is { path: string; blob: Blob } => entry !== null);

  return {
    fixtures: resolveImportedFixtureAddresses(existingFixtures, remappedFixtures),
    profiles: importedProfiles,
  };
}

export function downloadFixturesProfile(
  zip: Uint8Array,
  baseName = "fixtures",
): void {
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
    const { syncImportedAssetToDisk } = await import(
      "../platform/project-storage.tauri"
    );
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
