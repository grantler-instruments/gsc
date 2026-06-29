import { readFileSync } from "node:fs";
import { convertQlabWorkspaceToSnapshot } from "../src/lib/qlab5/convert-to-snapshot";
import { parseQlab5Workspace } from "../src/lib/qlab5/parse-workspace";

const ws = parseQlab5Workspace(
  new Uint8Array(readFileSync("/Users/thomas/Downloads/baerbel_audio/queues.qlab5")),
);
const stops = ws.cueLists.flatMap((l) => l.cues).filter((c) => c.type === "Stop");
console.log(
  "parsed stops with target:",
  stops.filter((s) => s.targetUniqueId).length,
  "/",
  stops.length,
);

const { snapshot, report } = convertQlabWorkspaceToSnapshot(ws);
const gscStops = snapshot.cueLists.flatMap((l) => l.cues).filter((c) => c.type === "stop");
console.log(
  "gsc stops with target:",
  gscStops.filter((s) => s.stopTargetId).length,
  "/",
  gscStops.length,
);
const targetWarnings = report.warnings.filter((w) => w.includes("Stop cue"));
console.log("warnings:", targetWarnings.length);
if (targetWarnings.length) console.log(targetWarnings.slice(0, 3));
