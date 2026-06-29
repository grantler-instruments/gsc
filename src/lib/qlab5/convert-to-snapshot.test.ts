import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { convertQlabWorkspaceToSnapshot } from "./convert-to-snapshot";
import { parseDecodedWorkspaceRoot } from "./parse-workspace";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, "../../../e2e/fixtures/qlab5/minimal");

describe("convertQlabWorkspaceToSnapshot", () => {
  it("converts the minimal QLab fixture into playable cue types", () => {
    const root = JSON.parse(readFileSync(join(fixtureDir, "decoded-workspace-root.json"), "utf8"));
    const workspace = parseDecodedWorkspaceRoot(root, "fixture.qlab5");
    const { snapshot, report } = convertQlabWorkspaceToSnapshot(workspace);
    const cues = snapshot.cueLists[0]?.cues ?? [];

    expect(snapshot.name).toBe("GSC Import Fixture");
    expect(cues.some((cue) => cue.name === "Intro Audio" && cue.type === "audio")).toBe(true);
    expect(cues.some((cue) => cue.name === "Intro Video" && cue.type === "video")).toBe(true);
    expect(cues.some((cue) => cue.type === "wait")).toBe(true);
    expect(cues.some((cue) => cue.type === "stop")).toBe(true);
    expect(report.skippedCues.some((entry) => entry.type === "Script")).toBe(true);
  });

  it("converts wait cues with duration", () => {
    const workspace = parseDecodedWorkspaceRoot(
      {
        cueLists: {
          uniqueID: "list-1",
          name: "Main",
          cues: [
            {
              uniqueID: "wait-1",
              number: "1",
              name: "Hold",
              type: "Wait",
              duration: 4.5,
            },
          ],
        },
      },
      "fixture.qlab5",
    );

    const { snapshot } = convertQlabWorkspaceToSnapshot(workspace);
    const wait = snapshot.cueLists[0]?.cues.find((cue) => cue.type === "wait");

    expect(wait).toMatchObject({
      name: "Hold",
      waitDurationSec: 4.5,
    });
  });

  it("attaches memo text to the following cue as notes", () => {
    const workspace = parseDecodedWorkspaceRoot(
      {
        cueLists: {
          uniqueID: "list-1",
          name: "Main",
          cues: [
            {
              uniqueID: "memo-1",
              number: "1",
              name: "Operator note",
              type: "Memo",
              notes: "Stand by for cue 2",
            },
            {
              uniqueID: "audio-1",
              number: "2",
              name: "Stinger",
              type: "Audio",
              fileTarget: { path: "audio/stinger.wav" },
            },
          ],
        },
      },
      "fixture.qlab5",
    );

    const { snapshot, report } = convertQlabWorkspaceToSnapshot(workspace);
    const audio = snapshot.cueLists[0]?.cues.find((cue) => cue.type === "audio");

    expect(audio?.notes).toBe("Stand by for cue 2");
    expect(report.skippedCues.some((entry) => entry.type === "Memo")).toBe(true);
  });

  it("inserts a pre-wait before a cue with preWaitSec", () => {
    const workspace = parseDecodedWorkspaceRoot(
      {
        cueLists: {
          uniqueID: "list-1",
          name: "Main",
          cues: [
            {
              uniqueID: "audio-1",
              number: "1",
              name: "Hit",
              type: "Audio",
              preWait: 2,
              fileTarget: { path: "audio/hit.wav" },
            },
          ],
        },
      },
      "fixture.qlab5",
    );

    const { snapshot } = convertQlabWorkspaceToSnapshot(workspace);
    const cues = snapshot.cueLists[0]?.cues ?? [];

    expect(cues[0]).toMatchObject({ type: "wait", waitDurationSec: 2, name: "Pre-wait" });
    expect(cues[1]).toMatchObject({ type: "audio", name: "Hit" });
  });

  it("maps opacity fades from fadeOpacity flag", () => {
    const workspace = parseDecodedWorkspaceRoot(
      {
        cueLists: {
          uniqueID: "list-1",
          name: "Main",
          cues: [
            {
              uniqueID: "video-1",
              number: "1",
              name: "Logo",
              type: "Video",
              fileTarget: { path: "video/logo.mp4" },
            },
            {
              uniqueID: "fade-1",
              number: "2",
              name: "Fade logo out",
              type: "Fade",
              duration: 2,
              doOpacity: true,
              cueTargetUniqueID: "video-1",
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
    const fade = snapshot.cueLists[0]?.cues.find((cue) => cue.type === "opacityFade");
    const video = snapshot.cueLists[0]?.cues.find((cue) => cue.type === "video");

    expect(fade).toMatchObject({
      fadeTargetId: video?.id,
      fadeDuration: 2,
      fadeTo: 0,
    });
  });

  it("labels imported cart lists with a cart suffix", () => {
    const workspace = parseDecodedWorkspaceRoot(
      {
        cueLists: {
          uniqueID: "cart-1",
          name: "Hot Cart",
          $classname: "F53Cart",
          type: "Cart",
          cues: [
            {
              uniqueID: "audio-1",
              number: "1",
              name: "Hit",
              type: "Audio",
              fileTarget: { path: "audio/hit.wav" },
            },
          ],
        },
      },
      "fixture.qlab5",
    );

    const { snapshot, report } = convertQlabWorkspaceToSnapshot(workspace);

    expect(snapshot.cueLists[0]?.name).toBe("Hot Cart (cart)");
    expect(report.warnings.some((warning) => warning.message.includes("Cart"))).toBe(true);
  });
});
