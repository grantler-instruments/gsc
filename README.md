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
| **MIDI** | Created from **+ Cue → MIDI**; edit channel/message in the Inspector (playback not wired yet) |

## .gsc projects

Project files are JSON with virtual asset paths (e.g. `/project/audio/intro.wav`). Re-import assets in the browser after opening a project; Tauri will later resolve real disk paths via the platform adapter.
