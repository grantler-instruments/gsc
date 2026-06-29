/**
 * One-off CLI: import a QLab 5 project folder and write a GSC .gsc project to disk.
 * Usage: npx vite-node scripts/import-qlab5-to-disk.ts <qlab-folder> <output-dir>
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { assetRelativePath } from "../src/lib/project-paths";
import { convertQlabWorkspaceToSnapshot } from "../src/lib/qlab5/convert-to-snapshot";
import type { createImportReport } from "../src/lib/qlab5/import-report";
import { parseQlab5Workspace } from "../src/lib/qlab5/parse-workspace";
import { resolveAndImportAssets } from "../src/lib/qlab5/resolve-assets";
import { QLAB5_WORKSPACE_EXTENSION } from "../src/lib/qlab5/types";
import type { ProjectSnapshot } from "../src/types/cue";

const qlabFolder = process.argv[2];
const outputDir = process.argv[3];

if (!qlabFolder || !outputDir) {
  console.error("Usage: npx vite-node scripts/import-qlab5-to-disk.ts <qlab-folder> <output-dir>");
  process.exit(1);
}

function findWorkspaceFile(folder: string): { path: string; bytes: Uint8Array } {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const entries = readdirSync(folder);
  const name = entries.find((e: string) => e.toLowerCase().endsWith(QLAB5_WORKSPACE_EXTENSION));
  if (!name) throw new Error(`No ${QLAB5_WORKSPACE_EXTENSION} file in ${folder}`);
  const path = join(folder, name);
  return { path, bytes: new Uint8Array(readFileSync(path)) };
}

async function main() {
  const { path: workspacePath, bytes } = findWorkspaceFile(qlabFolder);
  console.log("Parsing", workspacePath);

  const workspace = parseQlab5Workspace(bytes, workspacePath);
  console.log("Workspace:", workspace.name, "| lists:", workspace.cueLists.length);

  const { snapshot: initialSnapshot, report } = convertQlabWorkspaceToSnapshot(workspace);

  const readFile = async (absolutePath: string): Promise<Uint8Array | null> => {
    try {
      return new Uint8Array(readFileSync(absolutePath));
    } catch {
      return null;
    }
  };

  const { snapshot, resolved } = await resolveAndImportAssets({
    snapshot: initialSnapshot,
    mediaBaseDir: qlabFolder,
    readFile,
    report,
  });

  const projectDirName = `${snapshot.name.replace(/[^\w.-]+/g, "_")}.gsc`;
  const rootDir = join(outputDir, projectDirName);
  mkdirSync(join(rootDir, "assets"), { recursive: true });

  writeFileSync(join(rootDir, "project.json"), JSON.stringify(snapshot, null, 2));

  for (const asset of resolved) {
    const rel = assetRelativePath(asset.virtualPath);
    const dest = join(rootDir, rel);
    mkdirSync(join(dest, ".."), { recursive: true });
    writeFileSync(dest, asset.data);
  }

  printReport(snapshot, report, rootDir);
}

function printReport(
  snapshot: ProjectSnapshot,
  report: ReturnType<typeof createImportReport>,
  rootDir: string,
) {
  console.log("\nSaved to:", rootDir);
  console.log("Cues:", report.importedCueCount, "| Lists:", report.importedListCount);
  if (report.skippedCues.length) {
    console.log("\nSkipped cues:", report.skippedCues.length);
    for (const s of report.skippedCues.slice(0, 10)) {
      console.log(`  ${s.number} ${s.name} (${s.type}): ${s.reason}`);
    }
    if (report.skippedCues.length > 10)
      console.log(`  ... and ${report.skippedCues.length - 10} more`);
  }
  if (report.missingAssets.length) {
    console.log("\nMissing assets:", report.missingAssets.length);
    for (const p of report.missingAssets.slice(0, 10)) console.log(" ", p);
  }
  if (report.warnings.length) {
    console.log("\nWarnings:");
    for (const w of report.warnings) console.log(" ", w.message);
  }
  console.log("\nProject name:", snapshot.name);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
