#!/usr/bin/env node
/**
 * Generate short white-noise audio fixtures for e2e tests (WAV + transcoded formats).
 *
 * Usage: node e2e/fixtures/generate-audio-fixtures.mjs
 */

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @typedef {{ filename: string, durationSec: number }} ShortFixture */

/** @type {ShortFixture[]} */
const SHORT_FIXTURES = [
  { filename: "white-noise.wav", durationSec: 0.25 },
  { filename: "white-noise-alt.wav", durationSec: 0.25 },
];

const PLAYBACK_WAV = "white-noise-playback.wav";
const PLAYBACK_DURATION_SEC = 4;

/** @type {{ filename: string, args: string[] }[]} */
const TRANSCODED_FIXTURES = [
  { filename: "white-noise-playback.mp3", args: ["-codec:a", "libmp3lame", "-qscale:a", "4"] },
  { filename: "white-noise-playback.ogg", args: ["-codec:a", "libvorbis", "-qscale:a", "4"] },
  { filename: "white-noise-playback.flac", args: ["-codec:a", "flac"] },
  { filename: "white-noise-playback.m4a", args: ["-codec:a", "aac", "-b:a", "128k"] },
  { filename: "white-noise-playback.aac", args: ["-f", "adts", "-codec:a", "aac", "-b:a", "128k"] },
  { filename: "white-noise-playback.aiff", args: ["-codec:a", "pcm_s16be"] },
];

const sampleRate = 44_100;
const amplitude = 0.15;

function writeWhiteNoiseWav(outPath, durationSec) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i += 1) {
    const sample = Math.floor((Math.random() * 2 - 1) * amplitude * 32_767);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  writeFileSync(outPath, buffer);
  console.log(`Wrote ${path.basename(outPath)} (${buffer.length} bytes, ${durationSec}s)`);
}

function runFfmpeg(inputPath, outputPath, extraArgs) {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static binary is missing");
  }

  const result = spawnSync(
    ffmpegPath,
    ["-y", "-hide_banner", "-loglevel", "error", "-i", inputPath, ...extraArgs, outputPath],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    throw new Error(
      `ffmpeg failed for ${path.basename(outputPath)} (exit ${result.status ?? "unknown"})`,
    );
  }

  console.log(`Wrote ${path.basename(outputPath)}`);
}

for (const fixture of SHORT_FIXTURES) {
  writeWhiteNoiseWav(path.join(__dirname, fixture.filename), fixture.durationSec);
}

const playbackWavPath = path.join(__dirname, PLAYBACK_WAV);
writeWhiteNoiseWav(playbackWavPath, PLAYBACK_DURATION_SEC);

for (const fixture of TRANSCODED_FIXTURES) {
  runFfmpeg(playbackWavPath, path.join(__dirname, fixture.filename), fixture.args);
}
