import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodeKeyedArchiver } from "./keyed-archiver";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, "../../../e2e/fixtures/qlab5/minimal");

describe("decodeKeyedArchiver", () => {
  it("resolves a minimal keyed archive graph", () => {
    const json = JSON.parse(
      readFileSync(join(fixtureDir, "minimal-workspace.json"), "utf8"),
    ) as Record<string, unknown>;
    const root = decodeKeyedArchiver(json) as Record<string, unknown>;
    expect(root.$classname).toBe("F53Workspace");
    expect(root.name).toBe("GSC Import Fixture");
    expect(Array.isArray(root.cueLists)).toBe(true);
  });

  it("resolves cross-references between previously visited sibling objects", () => {
    const archive = {
      $archiver: "NSKeyedArchiver",
      $version: 100000,
      $top: { root: { UID: 1 } },
      $objects: [
        "$null",
        {
          $class: { UID: 2 },
          "NS.objects": [{ UID: 4 }, { UID: 7 }],
        },
        {
          $classname: "NSArray",
          $classes: ["NSArray", "NSObject"],
        },
        "target-uuid",
        {
          $class: { UID: 5 },
          uniqueID: { UID: 3 },
          name: { UID: 6 },
        },
        "Audio Target",
        {
          $classname: "AudioCue",
          $classes: ["AudioCue", "NSObject"],
        },
        {
          $class: { UID: 8 },
          uniqueID: { UID: 9 },
          name: { UID: 10 },
          cueTarget: { UID: 4 },
          cueTargetUniqueID: { UID: 3 },
        },
        {
          $classname: "StopCue",
          $classes: ["StopCue", "NSObject"],
        },
        "stop-uuid",
        "Stop Test",
      ],
    } as Record<string, unknown>;

    const cues = decodeKeyedArchiver(archive) as Array<Record<string, unknown>>;
    const stop = cues[1];
    expect(stop.$classname).toBe("StopCue");
    expect(stop.cueTargetUniqueID).toBe("target-uuid");
    expect(stop.cueTarget).not.toBeNull();
    expect((stop.cueTarget as Record<string, unknown>).uniqueID).toBe("target-uuid");
  });
});
