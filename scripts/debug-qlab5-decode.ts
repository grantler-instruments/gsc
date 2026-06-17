import { readFileSync } from "node:fs";
import { decodePlistRoot } from "../src/lib/qlab5/keyed-archiver";
import { parseDecodedWorkspaceRoot } from "../src/lib/qlab5/parse-workspace";

const root = decodePlistRoot(
  new Uint8Array(readFileSync("/Users/thomas/Downloads/baerbel_audio/queues.qlab5")),
) as Record<string, unknown>;
const cl = root.cueLists;
console.log("cueLists type:", typeof cl, Array.isArray(cl));
if (cl && typeof cl === "object") {
  const r = cl as Record<string, unknown>;
  console.log("keys sample:", Object.keys(r).slice(0, 12).join(", "));
  console.log("name:", r.name, "cues type:", typeof r.cues, Array.isArray(r.cues));
  if (r.cues && typeof r.cues === "object") {
    console.log("cues keys sample:", Object.keys(r.cues as object).slice(0, 5));
  }
}
try {
  const ws = parseDecodedWorkspaceRoot(root, "queues.qlab5");
  console.log("OK lists:", ws.cueLists.length, "cues:", ws.cueLists[0]?.cues.length);
} catch (e) {
  console.error((e as Error).message);
}
