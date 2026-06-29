#!/usr/bin/env node
/**
 * Generate short test-pattern video fixtures for e2e tests (MP4 + transcoded formats).
 *
 * Usage: node e2e/fixtures/generate-video-fixtures.mjs
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLAYBACK_MP4 = "test-video-playback.mp4";
const PLAYBACK_DURATION_SEC = 4;

/** @type {{ filename: string, args: string[] }[]} */
const TRANSCODED_FIXTURES = [
  {
    filename: "test-video-playback.webm",
    args: ["-codec:v", "libvpx", "-b:v", "500k", "-codec:a", "libvorbis", "-b:a", "128k"],
  },
  {
    filename: "test-video-playback.mov",
    args: ["-codec:v", "libx264", "-preset", "ultrafast", "-codec:a", "aac", "-b:a", "128k"],
  },
  {
    filename: "test-video-playback.mkv",
    args: ["-codec:v", "libx264", "-preset", "ultrafast", "-codec:a", "aac", "-b:a", "128k"],
  },
  {
    filename: "test-video-playback.m4v",
    args: [
      "-codec:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-codec:a",
      "aac",
      "-b:a",
      "128k",
      "-f",
      "mp4",
    ],
  },
];

function runFfmpeg(args) {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static binary is missing");
  }

  const result = spawnSync(ffmpegPath, ["-y", "-hide_banner", "-loglevel", "error", ...args], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed (exit ${result.status ?? "unknown"})`);
  }
}

const playbackMp4Path = path.join(__dirname, PLAYBACK_MP4);

runFfmpeg([
  "-f",
  "lavfi",
  "-i",
  `testsrc=duration=${PLAYBACK_DURATION_SEC}:size=320x240:rate=30`,
  "-f",
  "lavfi",
  "-i",
  `sine=frequency=440:duration=${PLAYBACK_DURATION_SEC}`,
  "-shortest",
  "-pix_fmt",
  "yuv420p",
  "-c:v",
  "libx264",
  "-preset",
  "ultrafast",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  playbackMp4Path,
]);
console.log(`Wrote ${PLAYBACK_MP4}`);

for (const fixture of TRANSCODED_FIXTURES) {
  runFfmpeg(["-i", playbackMp4Path, ...fixture.args, path.join(__dirname, fixture.filename)]);
  console.log(`Wrote ${fixture.filename}`);
}
