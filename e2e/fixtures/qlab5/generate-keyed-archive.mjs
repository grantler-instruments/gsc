/**
 * Generates a minimal QLab 5-style NSKeyedArchiver workspace for parser tests.
 * Run: node e2e/fixtures/qlab5/generate-keyed-archive.mjs
 *
 * On macOS uses plutil to emit binary .qlab5; elsewhere writes JSON only.
 */
import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "minimal");
mkdirSync(outDir, { recursive: true });

const workspace = {
  $classname: "F53Workspace",
  name: "GSC Import Fixture",
  uniqueID: "ws-fixture-001",
  currentCueListID: "list-main-001",
  archiveVersion: "5.0-test",
  cueLists: [
    {
      $classname: "F53CueList",
      uniqueID: "list-main-001",
      name: "Main Cue List",
      type: "CueList",
      cues: [
        {
          $classname: "F53AudioCue",
          uniqueID: "cue-audio-001",
          number: "1",
          name: "Intro Audio",
          type: "Audio",
          continueMode: "do_not_continue",
          fileTarget: "audio/white-noise-short-a.wav",
          level: 0.85,
          pan: 0,
          fadeInTime: 1,
          fadeOutTime: 0.5,
          startTime: 0,
          endTime: 2,
          loop: false,
        },
        {
          $classname: "F53VideoCue",
          uniqueID: "cue-video-001",
          number: "2",
          name: "Intro Video",
          type: "Video",
          continueMode: "auto_continue",
          fileTarget: "video/test-video-playback.mp4",
          opacity: 1,
        },
        {
          $classname: "F53GroupCue",
          uniqueID: "cue-group-001",
          number: "3",
          name: "Parallel Group",
          type: "Group",
          groupMode: "start_all",
          cues: [
            {
              $classname: "F53AudioCue",
              uniqueID: "cue-audio-002",
              number: "3.1",
              name: "Stinger",
              type: "Audio",
              fileTarget: "audio/white-noise-short-b.wav",
            },
          ],
        },
        {
          $classname: "F53GroupCue",
          uniqueID: "cue-seq-001",
          number: "4",
          name: "Timeline Group",
          type: "Group",
          groupMode: "timeline",
          cues: [
            {
              $classname: "F53WaitCue",
              uniqueID: "cue-wait-001",
              number: "4.1",
              name: "Hold",
              type: "Wait",
              duration: 2,
            },
            {
              $classname: "F53StopCue",
              uniqueID: "cue-stop-001",
              number: "4.2",
              name: "Stop Intro",
              type: "Stop",
              targetUniqueID: "cue-audio-001",
            },
          ],
        },
        {
          $classname: "F53MIDICue",
          uniqueID: "cue-midi-001",
          number: "5",
          name: "MIDI Note",
          type: "MIDI",
          midiMessageType: "note-on",
          channel: 1,
          note: 60,
          velocity: 100,
        },
        {
          $classname: "F53NetworkCue",
          uniqueID: "cue-osc-001",
          number: "6",
          name: "OSC Cue",
          type: "Network",
          destinationHost: "127.0.0.1",
          destinationPort: 53000,
          oscAddress: "/cue/1/start",
        },
        {
          $classname: "F53MemoCue",
          uniqueID: "cue-memo-001",
          number: "7",
          name: "Operator Note",
          type: "Memo",
          notes: "Check levels before GO",
        },
        {
          $classname: "F53ScriptCue",
          uniqueID: "cue-script-001",
          number: "8",
          name: "AppleScript",
          type: "Script",
        },
      ],
    },
  ],
};

writeFileSync(join(outDir, "decoded-workspace-root.json"), JSON.stringify(workspace, null, 2));

function buildKeyedArchive(rootObject) {
  const objects = ["$null"];
  const indexByRef = new Map();

  function uidFor(value) {
    if (value === null || value === undefined) return { UID: 0 };
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      if (!indexByRef.has(value)) {
        indexByRef.set(value, objects.length);
        objects.push(value);
      }
      return { UID: indexByRef.get(value) };
    }
    if (!indexByRef.has(value)) {
      indexByRef.set(value, objects.length);
      objects.push(value);
    }
    return { UID: indexByRef.get(value) };
  }

  function classDef(classname) {
    const def = { $classname: classname, $classes: [classname, "NSObject"] };
    return uidFor(def);
  }

  function encode(value) {
    if (value === null || value === undefined) return { UID: 0 };
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return uidFor(value);
    }
    if (Array.isArray(value)) {
      return uidFor(value.map((item) => encode(item)));
    }
    const out = { $class: classDef(value.$classname ?? "NSDictionary") };
    for (const [key, child] of Object.entries(value)) {
      if (key === "$classname") continue;
      out[key] = encode(child);
    }
    if (!indexByRef.has(out)) {
      indexByRef.set(out, objects.length);
      objects.push(out);
    }
    return { UID: indexByRef.get(out) };
  }

  const rootUid = encode(rootObject);
  return {
    $archiver: "NSKeyedArchiver",
    $version: 100000,
    $top: { root: rootUid },
    $objects: objects,
  };
}

const archive = buildKeyedArchive(workspace);
const jsonPlistPath = join(outDir, "minimal-workspace.json");
writeFileSync(jsonPlistPath, JSON.stringify(archive, null, 2));

const qlab5Path = join(outDir, "GSC Import Fixture.qlab5");
try {
  execSync(`plutil -convert binary1 "${jsonPlistPath}" -o "${qlab5Path}"`);
  console.log("Wrote", qlab5Path);
} catch {
  console.warn("plutil unavailable; binary .qlab5 not generated");
}

// Copy media into fixture project folder layout
const audioDir = join(outDir, "audio");
const videoDir = join(outDir, "video");
mkdirSync(audioDir, { recursive: true });
mkdirSync(videoDir, { recursive: true });
const fixturesRoot = join(__dirname, "..");
for (const file of ["white-noise-short-a.wav", "white-noise-short-b.wav"]) {
  copyFileSync(join(fixturesRoot, file), join(audioDir, file));
}
copyFileSync(
  join(fixturesRoot, "test-video-playback.mp4"),
  join(videoDir, "test-video-playback.mp4"),
);

console.log("QLab5 fixture generated in", outDir);
