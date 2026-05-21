# Grantler Stage Control (GSC)

Web-based show playback for audio and video cues. Same codebase runs in the browser and as a Tauri desktop app.

## Stack

- **Frontend:** React, TypeScript, Vite, Zustand
- **Desktop:** Tauri 2
- **Browser:** Virtual filesystem (drag-and-drop assets), `.gsc` project files

## Development (web-first)

```bash
npm install
npm run dev
```

Open [http://localhost:1421](http://localhost:1421). This is the primary workflow while building features.

## Tauri (desktop)

```bash
npm run tauri dev
```

Uses port **1421** (enomiga uses 1420).

## Project layout

```
src/
├── components/     # UI (cue list, assets, transport)
├── lib/            # .gsc save/load
├── platform/       # web vs tauri adapters
├── stores/         # Zustand (project, vfs, transport, ui)
├── types/          # cue & project types
└── vfs/            # in-memory virtual filesystem
```

## Cue types

| Type | Source |
|------|--------|
| **Audio** | Drag/import WAV, MP3, etc. |
| **Video** | Drag/import MP4, WebM, etc. |
| **Image** | Drag/import PNG, JPG, WebP, etc. |
| **MIDI** | **Out:** **+ Cue → MIDI**, GO sends to **Settings → MIDI output**. **In:** **Settings → MIDI map** to bind incoming notes/CCs to GO, select cue, panic, etc. |

## .gsc projects

### JSON (legacy / cues only)

Single `.gsc` JSON file with virtual asset paths (e.g. `/project/audio/intro.wav`). Does not include media bytes.

### Project bundle (`.gsc.zip`)

Portable zip used to move a show between web and desktop:

```
MyShow.gsc.zip
├── project.json    # ProjectSnapshotV2
└── project/        # media files
```

- **Web:** File → Export / Import project bundle
- **Tauri:** File → **Open…** (project folder or `.gsc.zip` bundle). **New Project** (⌘N) and first save use a **save dialog** (pick location + folder name); GSC creates that directory and autosaves there.
