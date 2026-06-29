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
  if (pkg.version === version) return;
  pkg.version = version;
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
}

function detectEol(contents) {
  return contents.includes("\r\n") ? "\r\n" : "\n";
}

function setCargoToml(version) {
  const path = join(root, "src-tauri", "Cargo.toml");
  const contents = readFileSync(path, "utf8");
  const match = contents.match(/^version = "(.*)"\r?$/m);
  if (!match) {
    throw new Error("Could not find version in Cargo.toml");
  }
  if (match[1] === version) return;
  writeFileSync(path, contents.replace(/^version = ".*"\r?$/m, `version = "${version}"`));
}

function setCargoLock(version) {
  const path = join(root, "src-tauri", "Cargo.lock");
  const contents = readFileSync(path, "utf8");
  const match = contents.match(/^name = "gsc"\r?\nversion = "(.*)"\r?$/m);
  if (!match) {
    throw new Error("Could not find gsc package version in Cargo.lock");
  }
  if (match[1] === version) return;
  const eol = detectEol(contents);
  writeFileSync(
    path,
    contents.replace(
      /^name = "gsc"\r?\nversion = ".*"\r?$/m,
      `name = "gsc"${eol}version = "${version}"`,
    ),
  );
}

const version = normalizeVersion(process.argv[2] ?? readVersion());
setPackageJson(version);
setCargoToml(version);
setCargoLock(version);
console.log(`Synced version to ${version}`);
