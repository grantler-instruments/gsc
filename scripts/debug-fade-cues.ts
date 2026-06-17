import { readFileSync } from "node:fs";
import { convertQlabWorkspaceToSnapshot } from "../src/lib/qlab5/convert-to-snapshot";
import { parseQlab5Workspace } from "../src/lib/qlab5/parse-workspace";

const ws = parseQlab5Workspace(
  new Uint8Array(readFileSync("/Users/thomas/Downloads/baerbel_audio/queues.qlab5")),
);
const { snapshot } = convertQlabWorkspaceToSnapshot(ws);
const cues = snapshot.cueLists[0]?.cues ?? [];
const top = cues.filter((c) => !c.parentId).slice(0, 5);
console.log("list name:", snapshot.cueLists[0]?.name);
console.log(
  "top cues:",
  top.map((c) => ({ number: c.number, name: c.name, notes: c.notes?.slice(0, 40) })),
);
