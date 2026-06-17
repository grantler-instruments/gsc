import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseQlab5Workspace } from "../src/lib/qlab5/parse-workspace";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bytes = readFileSync(
  join(__dirname, "../e2e/fixtures/qlab5/minimal/GSC Import Fixture.qlab5"),
);
const ws = parseQlab5Workspace(new Uint8Array(bytes));
const list = ws.cueLists[0];
console.log("fixture list:", list.name, "top-level:", list.cues.length);
for (const c of list.cues) {
  console.log(" ", c.type, c.name, "children:", c.children.length);
}
