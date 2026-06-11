#!/usr/bin/env node
/**
 * Write a short mono 16-bit PCM WAV of white noise for e2e drag-and-drop tests.
 *
 * Usage: node e2e/fixtures/generate-white-noise.mjs
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "white-noise.wav");

const sampleRate = 44_100;
const durationSec = 0.25;
const amplitude = 0.15;
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
console.log(`Wrote ${outPath} (${buffer.length} bytes)`);
