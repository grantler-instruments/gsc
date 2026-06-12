/** Media fixtures used by e2e tests. */

/** All supported import formats (see src/vfs/import.ts AUDIO_EXT). */
export const IMPORT_AUDIO_FIXTURES = [
  { fileName: "white-noise-playback.wav", mimeType: "audio/wav" },
  { fileName: "white-noise-playback.mp3", mimeType: "audio/mpeg" },
  { fileName: "white-noise-playback.ogg", mimeType: "audio/ogg" },
  { fileName: "white-noise-playback.flac", mimeType: "audio/flac" },
  { fileName: "white-noise-playback.m4a", mimeType: "audio/mp4" },
  { fileName: "white-noise-playback.aac", mimeType: "audio/aac" },
  // Chromium can import AIFF but Web Audio decodeAudioData rejects it — drop-only.
  { fileName: "white-noise-playback.aiff", mimeType: "audio/aiff" },
];

/** Formats Chromium can decode for real-time playback progress tests. */
export const PLAYBACK_AUDIO_FIXTURES = IMPORT_AUDIO_FIXTURES.filter(
  (fixture) => fixture.fileName !== "white-noise-playback.aiff",
);

/** All supported import formats (see src/vfs/import.ts VIDEO_EXT). */
export const IMPORT_VIDEO_FIXTURES = [
  { fileName: "test-video-playback.mp4", mimeType: "video/mp4" },
  { fileName: "test-video-playback.webm", mimeType: "video/webm" },
  { fileName: "test-video-playback.mov", mimeType: "video/quicktime" },
  { fileName: "test-video-playback.mkv", mimeType: "video/x-matroska" },
  { fileName: "test-video-playback.m4v", mimeType: "video/mp4" },
];

/** Formats Chromium can decode for real-time playback progress tests. */
export const PLAYBACK_VIDEO_FIXTURES = IMPORT_VIDEO_FIXTURES.filter(
  (fixture) => fixture.fileName !== "test-video-playback.mkv",
);
