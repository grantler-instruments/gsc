import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readVersion() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  return pkg.version;
}

function normalizeVersion(raw) {
  const version = raw.replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    throw new Error(`Invalid version: ${raw}`);
  }
  return version;
}

function setPackageJson(version) {
  const path = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  pkg.version = version;
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
}

function setCargoToml(version) {
  const path = join(root, "src-tauri", "Cargo.toml");
  const contents = readFileSync(path, "utf8");
  const updated = contents.replace(/^version = ".*"$/m, `version = "${version}"`);
  if (updated === contents) {
    throw new Error("Could not update version in Cargo.toml");
  }
  writeFileSync(path, updated);
}

const version = normalizeVersion(process.argv[2] ?? readVersion());
setPackageJson(version);
setCargoToml(version);
console.log(`Synced version to ${version}`);
