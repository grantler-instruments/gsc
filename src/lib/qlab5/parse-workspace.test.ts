import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { convertQlabWorkspaceToSnapshot } from "./convert-to-snapshot";
import { parseDecodedWorkspaceRoot, parseQlab5Workspace } from "./parse-workspace";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, "../../../e2e/fixtures/qlab5/minimal");

describe("parseQlab5Workspace", () => {
  it("parses binary fixture workspace", () => {
    const bytes = readFileSync(join(fixtureDir, "GSC Import Fixture.qlab5"));
    const workspace = parseQlab5Workspace(new Uint8Array(bytes), "GSC Import Fixture.qlab5");
    expect(workspace.name).toBe("GSC Import Fixture");
    expect(workspace.cueLists.length).toBeGreaterThan(0);
    expect(workspace.cueLists[0]?.cues.length).toBeGreaterThan(5);
  });

  it("parses decoded JSON root", () => {
    const root = JSON.parse(readFileSync(join(fixtureDir, "decoded-workspace-root.json"), "utf8"));
    const workspace = parseDecodedWorkspaceRoot(root, "fixture.qlab5");
    const audio = workspace.cueLists[0]?.cues.find((c) => c.type === "Audio");
    expect(audio?.fileTarget?.path).toContain("white-noise-short-a.wav");
  });
});

describe("convertQlabWorkspaceToSnapshot", () => {
  it("maps core cue types into GSC snapshot", () => {
    const root = JSON.parse(readFileSync(join(fixtureDir, "decoded-workspace-root.json"), "utf8"));
    const workspace = parseDecodedWorkspaceRoot(root, "fixture.qlab5");
    const { snapshot, report } = convertQlabWorkspaceToSnapshot(workspace);
    const cues = snapshot.cueLists[0]?.cues ?? [];

    expect(snapshot.version).toBe(2);
    expect(cues.some((c) => c.type === "audio")).toBe(true);
    expect(cues.some((c) => c.type === "video")).toBe(true);
    expect(cues.some((c) => c.type === "midi")).toBe(true);
    expect(cues.some((c) => c.type === "osc")).toBe(true);
    expect(cues.some((c) => c.type === "group" || c.type === "sequence")).toBe(true);
    expect(report.skippedCues.some((s) => s.type === "Script")).toBe(true);
    expect(report.importedCueCount).toBeGreaterThan(0);
  });

  it("reads stop cue targets from cueTargetUniqueID", () => {
    const root = {
      cueLists: {
        uniqueID: "list-1",
        name: "Main",
        cues: [
          {
            uniqueID: "audio-1",
            number: "1",
            name: "Audio Target",
            type: "Audio",
            fileTarget: { path: "audio/test.wav" },
          },
          {
            uniqueID: "stop-1",
            number: "2",
            name: "Stop Audio",
            type: "Stop",
            cueTargetUniqueID: "audio-1",
          },
        ],
      },
    };
    const workspace = parseDecodedWorkspaceRoot(root, "fixture.qlab5");
    const stop = workspace.cueLists[0]?.cues.find((c) => c.type === "Stop");
    expect(stop?.targetUniqueId).toBe("audio-1");

    const { snapshot } = convertQlabWorkspaceToSnapshot(workspace);
    const gscStop = snapshot.cueLists[0]?.cues.find((c) => c.type === "stop");
    const gscAudio = snapshot.cueLists[0]?.cues.find((c) => c.type === "audio");
    expect(gscStop?.stopTargetId).toBe(gscAudio?.id);
  });

  it("maps fade levels and stop-when-done into a sequence group", () => {
    const workspace = parseDecodedWorkspaceRoot(
      {
        cueLists: {
          uniqueID: "list-1",
          name: "Main",
          cues: [
            {
              uniqueID: "audio-1",
              number: "1",
              name: "Loop",
              type: "Audio",
              fileTarget: { path: "audio/test.wav" },
            },
            {
              uniqueID: "fade-1",
              number: "2",
              name: "Fade Out And Stop",
              type: "Fade",
              duration: 3,
              cueTargetUniqueID: "audio-1",
              stopTargetWhenDone: true,
              fade: {
                entries: {
                  0: {
                    $classname: "FadeValueEntry",
                    row: 0,
                    column: 0,
                    startValue: 1,
                    endValue: 0,
                  },
                },
                shapes: {
                  upShape: {
                    shapeEntries: [
                      { v: 0, t: 0 },
                      { v: 1, t: 1 },
                    ],
                  },
                  downShape: {
                    shapeEntries: [
                      { v: 1, t: 0 },
                      { v: 0, t: 1 },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
      "fixture.qlab5",
    );

    const { snapshot } = convertQlabWorkspaceToSnapshot(workspace);
    const cues = snapshot.cueLists[0]?.cues ?? [];
    const sequence = cues.find((c) => c.type === "sequence");
    const fade = cues.find((c) => c.type === "volumeFade");
    const stop = cues.find((c) => c.type === "stop");
    const audio = cues.find((c) => c.type === "audio");

    expect(sequence?.name).toBe("Fade Out And Stop");
    expect(sequence?.parentId).toBeUndefined();
    expect(sequence?.number).toBe("2");
    expect(fade).toMatchObject({
      parentId: sequence?.id,
      fadeTargetId: audio?.id,
      fadeTo: 0,
      fadeFrom: 1,
      fadeDuration: 3,
    });
    expect(stop).toMatchObject({
      parentId: sequence?.id,
      stopTargetId: audio?.id,
    });
    expect(audio?.number).toBe("1");
    expect(audio?.name).toBe("Loop");
  });

  it("unwraps QLab Main Cue List root wrapper into top-level cues", () => {
    const workspace = parseDecodedWorkspaceRoot(
      {
        cueLists: {
          uniqueID: "list-1",
          name: "Cue List",
          cues: [
            {
              uniqueID: "wrapper-1",
              name: "Main Cue List",
              type: "Group",
              groupMode: "start_all",
              cues: [
                {
                  uniqueID: "audio-1",
                  number: "1",
                  name: "Intro",
                  type: "Audio",
                  fileTarget: { path: "audio/test.wav" },
                },
                {
                  uniqueID: "group-1",
                  number: "2",
                  name: "Parallel Group",
                  type: "Group",
                  groupMode: "start_all",
                  cues: [
                    {
                      uniqueID: "audio-2",
                      number: "2.1",
                      name: "Stinger",
                      type: "Audio",
                      fileTarget: { path: "audio/stinger.wav" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      "fixture.qlab5",
    );

    const { snapshot } = convertQlabWorkspaceToSnapshot(workspace);
    const cues = snapshot.cueLists[0]?.cues ?? [];
    const topLevel = cues.filter((c) => !c.parentId);

    expect(topLevel.some((c) => c.name === "Main Cue List")).toBe(false);
    expect(topLevel.some((c) => c.name === "Intro")).toBe(true);
    expect(topLevel.some((c) => c.name === "Parallel Group" && c.type === "group")).toBe(true);
  });
});
