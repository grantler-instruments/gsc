import { readFileSync } from "node:fs";
import { parseBinaryPlist } from "../src/lib/qlab5/bplist";
import { decodePlistRoot } from "../src/lib/qlab5/keyed-archiver";

function getCueListBuffer(path: string): Buffer {
  const plist = parseBinaryPlist(new Uint8Array(readFileSync(path))) as Record<string, unknown>;
  const objects = plist.$objects as unknown[];
  const top = plist.$top as Record<string, unknown>;
  const rootUid = (top.root ?? top.NSKeyedArchiveRootObjectKey) as { UID: number };
  const rootInst = objects[rootUid.UID] as Record<string, unknown>;
  const keys = rootInst["NS.keys"] as Array<{ UID: number }>;
  const vals = rootInst["NS.objects"] as Array<{ UID: number }>;
  for (let i = 0; i < keys.length; i++) {
    if (objects[keys[i].UID] === "cueLists") {
      const dataInst = objects[vals[i].UID] as Record<string, unknown>;
      return (dataInst["NS.data"] ?? dataInst.data) as Buffer;
    }
  }
  throw new Error("no cueLists");
}

const buffer = getCueListBuffer("/Users/thomas/Downloads/baerbel_audio/queues.qlab5");
const nested = parseBinaryPlist(new Uint8Array(buffer)) as Record<string, unknown>;
const objects = nested.$objects as unknown[];

// First stop cue at idx 1008
const stop = objects[1008] as Record<string, unknown>;
console.log("cueTargetUniqueID raw:", objects[(stop.cueTargetUniqueID as { UID: number }).UID]);
console.log(
  "cueTarget raw class:",
  objects[((objects[763] as Record<string, unknown>).$class as { UID: number }).UID],
);

const decoded = decodePlistRoot(new Uint8Array(buffer)) as Record<string, unknown>;
function findStop(node: unknown): void {
  const r = node as Record<string, unknown>;
  if (!r || typeof r !== "object") return;
  if (r.$classname === "StopCue" && String(r.name).includes("Katharina")) {
    console.log("\nDecoded stop keys:", Object.keys(r).sort().join(", "));
    console.log("cueTargetUniqueID:", r.cueTargetUniqueID);
    console.log("cueTarget:", r.cueTarget);
  }
  const cues = r.cues;
  if (cues && typeof cues === "object") {
    const arr = Array.isArray(cues)
      ? cues
      : Object.keys(cues)
          .filter((k) => /^\d+$/.test(k))
          .map((k) => (cues as Record<string, unknown>)[k]);
    for (const c of arr) findStop(c);
  }
}
findStop(decoded);
