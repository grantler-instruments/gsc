#!/usr/bin/env node
/**
 * e2e specs run in Node ESM; importing src/ can pull i18n JSON, Tauri shims, etc.
 * Keep shared test math in e2e/shared/ instead.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const E2E_DIR = "e2e";
const FORBIDDEN = /from\s+["'](?:\.\.\/)*src\//;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, files);
    } else if (name.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

const violations = [];
for (const file of walk(E2E_DIR)) {
  const content = readFileSync(file, "utf8");
  if (FORBIDDEN.test(content)) {
    violations.push(file);
  }
}

if (violations.length > 0) {
  console.error("e2e tests must not import from src/ (use e2e/shared/ for test helpers):\n");
  for (const file of violations) {
    console.error(`  ${file}`);
  }
  process.exit(1);
}
