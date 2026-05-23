import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { strToU8, zipSync } from "fflate";

/** Stable ids so Puppeteer can target `[data-cue-id]` rows. */
export const DEMO_PROJECT_ID = "a0000000-0000-4000-8000-000000000001";
export const LIST_ACT1_ID = "a0000000-0000-4000-8000-000000000011";
export const LIST_ACT2_ID = "a0000000-0000-4000-8000-000000000012";

const FIXTURE_WASH_ID = "fixture-wash";
const FIXTURE_HOUSE_ID = "fixture-house";

const CUE_OPENING = "cue-opening";
const CUE_TITLE = "cue-title";
const CUE_STING = "cue-sting";
const CUE_MIDI = "cue-midi";
const CUE_OSC = "cue-osc";
const CUE_SEQUENCE = "cue-sequence";
const CUE_SEQ_STEP1 = "cue-seq-step1";
const CUE_WAIT = "cue-wait";
const CUE_SEQ_STEP2 = "cue-seq-step2";
const CUE_PARALLEL = "cue-parallel";
const CUE_PAR_AUDIO = "cue-par-audio";
const CUE_PAR_MIDI = "cue-par-midi";
const CUE_VOL_FADE = "cue-vol-fade";
const CUE_OP_FADE = "cue-op-fade";
const CUE_STOP = "cue-stop";
const CUE_DMX = "cue-dmx";
const CUE_ACT2_INTRO = "cue-act2-intro";
const CUE_ACT2_TITLE = "cue-act2-title";

export const DEMO_CUE_IDS = {
  opening: CUE_OPENING,
  title: CUE_TITLE,
  sting: CUE_STING,
  midi: CUE_MIDI,
  osc: CUE_OSC,
  sequence: CUE_SEQUENCE,
  seqStep1: CUE_SEQ_STEP1,
  wait: CUE_WAIT,
  seqStep2: CUE_SEQ_STEP2,
  parallel: CUE_PARALLEL,
  parAudio: CUE_PAR_AUDIO,
  parMidi: CUE_PAR_MIDI,
  volFade: CUE_VOL_FADE,
  opFade: CUE_OP_FADE,
  stop: CUE_STOP,
  dmx: CUE_DMX,
  act2Intro: CUE_ACT2_INTRO,
};

const AUDIO_OPENING = "/project/audio/opening-theme.wav";
const AUDIO_STING = "/project/audio/sting.wav";
const IMAGE_TITLE = "/project/images/title-card.png";

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([length, typeBuf, data, crc]);
}

/** Simple solid PNG for image cues and the visual monitor. */
export function createSolidPng(width, height, [r, g, b]) {
  const row = Buffer.alloc(1 + width * 3);
  row[0] = 0;
  for (let x = 0; x < width; x += 1) {
    const offset = 1 + x * 3;
    row[offset] = r;
    row[offset + 1] = g;
    row[offset + 2] = b;
  }
  const raw = Buffer.alloc((1 + width * 3) * height);
  for (let y = 0; y < height; y += 1) {
    row.copy(raw, y * row.length);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Short stereo WAV tone — enough length for a visible waveform. */
export function createToneWav({ durationSec = 4, sampleRate = 44100, frequency = 220 } = {}) {
  const numSamples = Math.floor(durationSec * sampleRate);
  const numChannels = 2;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t * 4) * Math.min(1, (durationSec - t) * 4);
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.35 * envelope;
    const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    const offset = 44 + i * blockAlign;
    buffer.writeInt16LE(intSample, offset);
    buffer.writeInt16LE(intSample, offset + 2);
  }

  return buffer;
}

function assetEntry(path, blob, mimeType, kind) {
  const data = blob instanceof Buffer ? new Uint8Array(blob) : blob;
  return {
    path,
    name: path.split("/").pop() ?? path,
    size: data.byteLength,
    mimeType,
    kind,
    data: Array.from(data),
  };
}

export function buildDemoAssets() {
  const openingWav = createToneWav({ durationSec: 5, frequency: 196 });
  const stingWav = createToneWav({ durationSec: 1.2, frequency: 440 });
  const titlePng = createSolidPng(1280, 720, [18, 42, 88]);

  return [
    assetEntry(AUDIO_OPENING, openingWav, "audio/wav", "audio"),
    assetEntry(AUDIO_STING, stingWav, "audio/wav", "audio"),
    assetEntry(IMAGE_TITLE, titlePng, "image/png", "image"),
  ];
}

export function buildDemoSnapshot() {
  const fixtures = [
    {
      id: FIXTURE_WASH_ID,
      name: "Front wash",
      universe: 1,
      startAddress: 1,
      channelCount: 3,
      ofl: {
        filePath: "/project/fixtures/ofl/generic/rgb-par.json",
        manufacturerKey: "generic",
        manufacturer: "Generic",
        fixtureKey: "rgb-par",
        model: "RGB Par",
        modeName: "3 Channel RGB",
        channels: [{ key: "Red" }, { key: "Green" }, { key: "Blue" }],
      },
    },
    {
      id: FIXTURE_HOUSE_ID,
      name: "House lights",
      universe: 1,
      startAddress: 10,
      channelCount: 1,
    },
  ];

  const act1Cues = [
    {
      id: CUE_OPENING,
      number: "1",
      name: "Opening theme",
      type: "audio",
      assetPath: AUDIO_OPENING,
      inTime: 0.5,
      outTime: 4.5,
      fadeIn: 0.25,
      fadeOut: 0.5,
      notes: "House to half.",
    },
    {
      id: CUE_TITLE,
      number: "2",
      name: "Title card",
      type: "image",
      assetPath: IMAGE_TITLE,
      opacity: 1,
    },
    {
      id: CUE_STING,
      number: "3",
      name: "Sting",
      type: "audio",
      assetPath: AUDIO_STING,
    },
    {
      id: CUE_MIDI,
      number: "4",
      name: "MIDI hit",
      type: "midi",
      midi: {
        channel: 1,
        kind: "note-on",
        note: 36,
        velocity: 127,
      },
    },
    {
      id: CUE_OSC,
      number: "5",
      name: "OSC pulse",
      type: "osc",
      osc: {
        host: "127.0.0.1",
        port: 9000,
        address: "/gsc/pulse",
        args: [{ type: "float", value: 1 }],
      },
    },
    {
      id: CUE_SEQUENCE,
      number: "6",
      name: "Entrance sequence",
      type: "sequence",
    },
    {
      id: CUE_SEQ_STEP1,
      number: "6.1",
      name: "Walk-on audio",
      type: "audio",
      parentId: CUE_SEQUENCE,
      assetPath: AUDIO_STING,
    },
    {
      id: CUE_WAIT,
      number: "6.2",
      name: "Hold",
      type: "wait",
      parentId: CUE_SEQUENCE,
      waitDurationSec: 2,
    },
    {
      id: CUE_SEQ_STEP2,
      number: "6.3",
      name: "Title hold",
      type: "image",
      parentId: CUE_SEQUENCE,
      assetPath: IMAGE_TITLE,
    },
    {
      id: CUE_PARALLEL,
      number: "7",
      name: "Parallel hit",
      type: "group",
    },
    {
      id: CUE_PAR_AUDIO,
      number: "7.1",
      name: "Drums",
      type: "audio",
      parentId: CUE_PARALLEL,
      assetPath: AUDIO_STING,
    },
    {
      id: CUE_PAR_MIDI,
      number: "7.2",
      name: "Keys",
      type: "midi",
      parentId: CUE_PARALLEL,
      midi: {
        channel: 2,
        kind: "note-on",
        note: 60,
        velocity: 100,
      },
    },
    {
      id: CUE_VOL_FADE,
      number: "8",
      name: "Music out",
      type: "volumeFade",
      fadeTargetId: CUE_OPENING,
      fadeDuration: 3,
      fadeFrom: 1,
      fadeTo: 0,
    },
    {
      id: CUE_OP_FADE,
      number: "9",
      name: "Title out",
      type: "opacityFade",
      fadeTargetId: CUE_TITLE,
      fadeDuration: 2,
      fadeFrom: 1,
      fadeTo: 0,
    },
    {
      id: CUE_STOP,
      number: "10",
      name: "Cut sting",
      type: "stop",
      stopTargetId: CUE_STING,
    },
    {
      id: CUE_DMX,
      number: "11",
      name: "Wash look",
      type: "dmx",
      dmx: {
        mode: "partial",
        fixtures: [
          {
            fixtureId: FIXTURE_WASH_ID,
            values: [255, 128, 64],
          },
          {
            fixtureId: FIXTURE_HOUSE_ID,
            values: [180],
          },
        ],
      },
    },
  ];

  const act2Cues = [
    {
      id: CUE_ACT2_INTRO,
      number: "1",
      name: "Act two opener",
      type: "audio",
      assetPath: AUDIO_OPENING,
      inTime: 0,
      outTime: 3,
    },
    {
      id: CUE_ACT2_TITLE,
      number: "2",
      name: "Reprise title",
      type: "image",
      assetPath: IMAGE_TITLE,
    },
  ];

  return {
    version: 2,
    id: DEMO_PROJECT_ID,
    name: "Demo Show",
    cueLists: [
      { id: LIST_ACT1_ID, name: "Act 1", cues: act1Cues },
      { id: LIST_ACT2_ID, name: "Act 2", cues: act2Cues },
    ],
    activeCueListId: LIST_ACT1_ID,
    midiMappings: [
      {
        id: "map-go",
        match: { channel: 1, kind: "note-on", note: 36, velocity: 127 },
        action: { type: "go-cue", cueId: CUE_OPENING },
      },
      {
        id: "map-panic",
        match: { channel: 1, kind: "note-on", note: 37, velocity: 127 },
        action: { type: "panic" },
      },
    ],
    fixtures,
    fixturePlot: {
      entries: [
        {
          fixtureId: FIXTURE_WASH_ID,
          x: 0.28,
          y: 0.35,
          size: 0.12,
          render: "rgb",
        },
        {
          fixtureId: FIXTURE_HOUSE_ID,
          x: 0.72,
          y: 0.62,
          size: 0.1,
          render: "dimmer",
        },
      ],
    },
  };
}

export function buildDemoBundleZip() {
  const snapshot = buildDemoSnapshot();
  const assets = buildDemoAssets();
  const zipEntries = {
    "project.json": strToU8(JSON.stringify(snapshot, null, 2)),
  };

  for (const asset of assets) {
    const relative = asset.path.replace(/^\//, "");
    zipEntries[`project/${relative.replace(/^project\//, "")}`] = Uint8Array.from(asset.data);
  }

  return zipSync(zipEntries);
}

/** Payload passed into the browser to seed autosave + Cache API. */
export function buildBrowserSeed() {
  const snapshot = buildDemoSnapshot();
  const assets = buildDemoAssets();
  const persistedAssets = assets.map(({ path, name, size, mimeType, kind }) => ({
    path,
    name,
    size,
    mimeType,
    kind,
  }));

  return {
    projectId: DEMO_PROJECT_ID,
    snapshot,
    assets,
    persistedAssets,
    sessionJson: JSON.stringify({
      snapshot,
      assets: persistedAssets,
    }),
    bundleZip: buildDemoBundleZip(),
  };
}

export function seedFingerprint(seed) {
  return createHash("sha256")
    .update(JSON.stringify(seed.snapshot))
    .update(String(seed.bundleZip.byteLength))
    .digest("hex")
    .slice(0, 12);
}
