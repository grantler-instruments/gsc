# Remote Control Architecture

This document explains how desktop remote control works in GSC.

## Goals

- Keep the booth desktop app authoritative for playback and engines.
- Let phone/tablet clients control cues in show mode.
- Reuse existing show-mode UI where possible.
- Avoid full store mirroring between devices.

## Runtime roles

- **Host (booth desktop app):** Runs audio/video/DMX/MIDI/OSC engines and owns project state.
- **Remote client (phone/tablet browser):** UI + command sender + snapshot renderer.
- **Remote server (Tauri/Rust):** Axum HTTP + WebSocket transport, PIN auth, fanout.

## Routing and mode

- Remote UI is opened with `?mode=remote`.
- `src/app/main.tsx` renders `RemoteApp` when `isRemoteClient()` is true.
- The host starts/stops the remote server from Settings.
- Remote PIN is user-configurable (6 digits) and persisted in preferences.
- Optional auto-start can start the remote server automatically on app launch.

## Data flow

### 1) Remote -> Host: commands

The remote sends compact command messages over WebSocket, for example:

- `go`
- `select-cue`
- `panic`
- `set-master-volume`
- `set-active-cue-list`

Host command handling lives in `src/lib/remote-host.ts` and always runs booth-side trigger logic.

### 2) Host -> Remote: snapshots

The host broadcasts JSON snapshots containing remote-visible state:

- project snapshot (cue lists, fixtures, etc.)
- selection and active cue list
- transport state
- playback progress
- DMX preview state and fixture plot values

Snapshot build/apply code lives in `src/lib/remote-snapshot.ts`.

## Why commands + snapshots

GSC intentionally does **not** mirror Zustand stores bidirectionally.
Using commands in and snapshots out keeps behavior deterministic and easier to debug.
Today host selection updates are also delivered through the same snapshot channel (not a separate selection wire message).

## Media assets over HTTP (Tier 2)

Remote media UI (waveforms, thumbnails, previews) fetches full asset files from the host over HTTP:

- Route: `GET /remote/asset?path=/assets/...&pin=...`
- Served by Rust remote server in `src-tauri/src/remote.rs`
- Reads files from the currently open `.gsc` project root on booth
- Path traversal is rejected (`..` and invalid paths)
- PIN required (same PIN as remote session)

Client-side fetch path:

- `src/platform/vfs-asset.ts` chooses remote fetch when `isRemoteClient()`
- `src/platform/remote-asset.ts` fetches and stores blobs into VFS
- Existing waveform/thumbnail code then works through normal asset APIs

Playback still happens on the booth app only.

## Dev vs production

- **Dev (`tauri dev`):**
  - Remote page served by Vite (`:1421`) for hot reload
  - WebSocket and `/remote/asset` served by Rust remote port (default `:8766`)
- **Production build:**
  - Rust remote port serves built UI + WebSocket + `/remote/asset` on the same port

## Key files

- Rust server: `src-tauri/src/remote.rs`
- Host orchestration: `src/hooks/useRemoteHost.ts`
- Remote client connection: `src/lib/remote-client.ts`
- Snapshot model: `src/lib/remote-snapshot.ts`
- Command mapping: `src/lib/remote-command.ts`
- Remote app shell: `src/components/RemoteApp.tsx`
- Asset HTTP helpers: `src/platform/remote-asset.ts`, `src/platform/remote-asset-url.ts`
