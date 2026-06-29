import { readFileSync } from "node:fs";
import { parseQlab5Workspace } from "../src/lib/qlab5/parse-workspace";

const ws = parseQlab5Workspace(
  new Uint8Array(readFileSync("/Users/thomas/Downloads/baerbel_audio/queues.qlab5")),
);
const root = ws.cueLists[0]?.cues[0];
console.log(
  JSON.stringify(
    {
      type: root?.type,
      name: root?.name,
      number: root?.number,
      groupMode: root?.groupMode,
      children: root?.children.length,
    },
    null,
    2,
  ),
);
