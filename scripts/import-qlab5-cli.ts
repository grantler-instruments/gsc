/**
 * CLI: import a QLab 5 workspace folder and write a GSC project to disk.
 *
 * Usage:
 *   npx vite-node scripts/import-qlab5-cli.ts <qlab-folder> <output-root>
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  assetRelativePath,
  PROJECT_JSON,
  projectDirNameFromShowName,
} from "../src/lib/project-paths";
import { convertQlabWorkspaceToSnapshot } from "../src/lib/qlab5/convert-to-snapshot";
import { createImportReport } from "../src/lib/qlab5/import-report";
import { parseQlab5Workspace } from "../src/lib/qlab5/parse-workspace";
import { resolveAndImportAssets } from "../src/lib/qlab5/resolve-assets";
import { QLAB5_WORKSPACE_EXTENSION } from "../src/lib/qlab5/types";
import type { ProjectSnapshot } from "../src/types/cue";
import { vfsClear, vfsGet } from "../src/vfs/engine";

function findWorkspaceFile(folder: string): { path: string; bytes: Uint8Array } {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const entries = readdirSync(folder) as string[];
  const name = entries.find((e) => e.toLowerCase().endsWith(QLAB5_WORKSPACE_EXTENSION));
  if (!name) throw new Error(`No ${QLAB5_WORKSPACE_EXTENSION} file in ${folder}`);
  const path = join(folder, name);
  return { path, bytes: new Uint8Array(readFileSync(path)) };
}

async function writeProjectToDisk(rootDir: string, snapshot: ProjectSnapshot): Promise<void> {
  mkdirSync(rootDir, { recursive: true });
  const assetPaths = new Set<string>();
  for (const list of snapshot.cueLists) {
    for (const cue of list.cues) {
      if (cue.assetPath) assetPaths.add(cue.assetPath);
    }
  }

  for (const virtualPath of assetPaths) {
    const blob = vfsGet(virtualPath);
    if (!blob) continue;
    const rel = assetRelativePath(virtualPath);
    const diskPath = join(rootDir, rel);
    mkdirSync(dirname(diskPath), { recursive: true });
    writeFileSync(diskPath, Buffer.from(await blob.arrayBuffer()));
  }

  writeFileSync(join(rootDir, PROJECT_JSON), JSON.stringify(snapshot, null, 2));
}

async function main(): Promise<void> {
  const qlabFolder = process.argv[2];
  const outputRoot = process.argv[3];
  if (!qlabFolder || !outputRoot) {
    console.error("Usage: vite-node scripts/import-qlab5-cli.ts <qlab-folder> <output-root>");
    process.exit(1);
  }

  vfsClear();
  const { path: workspacePath, bytes } = findWorkspaceFile(qlabFolder);
  console.log("Parsing", workspacePath);

  const workspace = parseQlab5Workspace(bytes, workspacePath);
  console.log("Workspace:", workspace.name, "| lists:", workspace.cueLists.length);

  const { snapshot: initial, report } = convertQlabWorkspaceToSnapshot(workspace);
  const readFile = async (absolutePath: string): Promise<Uint8Array | null> => {
    try {
      return new Uint8Array(readFileSync(absolutePath));
    } catch {
      return null;
    }
  };

  const { snapshot } = await resolveAndImportAssets({
    snapshot: initial,
    mediaBaseDir: qlabFolder,
    readFile,
    report,
  });

  const projectDir = join(outputRoot, projectDirNameFromShowName(snapshot.name));
  await writeProjectToDisk(projectDir, snapshot);

  console.log("\nSaved GSC project to:", projectDir);
  console.log("Imported cues:", report.importedCueCount);
  console.log("Imported lists:", report.importedListCount);
  console.log("Skipped cues:", report.skippedCues.length);
  console.log("Missing assets:", report.missingAssets.length);
  if (report.skippedCues.length > 0) {
    console.log("\nSkipped (first 10):");
    for (const entry of report.skippedCues.slice(0, 10)) {
      console.log(`  ${entry.number} ${entry.name} (${entry.type}): ${entry.reason}`);
    }
  }
  if (report.missingAssets.length > 0) {
    console.log("\nMissing assets (first 10):");
    for (const path of report.missingAssets.slice(0, 10)) {
      console.log(`  ${path}`);
    }
  }
  if (report.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of report.warnings) console.log(`  ${w.message}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
