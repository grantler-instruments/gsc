# Grantler Stage Control (GSC)

Web-based show playback for audio and video cues. Same codebase runs in the browser and as a Tauri desktop app.

**Live site (GitHub Pages):** https://grantler-instruments.github.io/gsc/  
**Web app:** https://grantler-instruments.github.io/gsc/app/

## Stack

- **Frontend:** React, TypeScript, Vite, Zustand, MUI
- **Desktop:** Tauri 2
- **Browser:** Virtual filesystem (drag-and-drop assets), `.gsc` project files

## Development

```bash
npm install
npm run dev
```

| URL | What |
|-----|------|
| http://localhost:1421/gsc/ | Marketing website (no app stores / MIDI init) |
| http://localhost:1421/gsc/app/ | Show control app |

## Tauri (desktop)

```bash
npm run tauri dev
```

Opens **http://localhost:1421/gsc/app/** (port **1421**; enomiga uses 1420).

## Build

```bash
npm run build          # dist/ for Tauri (base /)
npm run build:pages    # dist/ for GitHub Pages (base /gsc/)
npm run preview:pages  # preview the Pages build locally
```

## Deploy to GitHub Pages

Repo must be named **`gsc`** under `grantler-instruments` for `https://grantler-instruments.github.io/gsc/`.

1. **Settings → Pages → Build and deployment:** GitHub Actions
2. Push to `main` (or run **Deploy to GitHub Pages** manually)

The workflow runs `npm run build:pages` and publishes `dist/` (website + app).

## Project layout

```
index.html           # website entry (/)
app/index.html       # show control entry (/app/)
src/
├── website/         # marketing site only
├── app/main.tsx     # app bootstrap (stores, MIDI, audio)
├── brand/           # shared logo (GscLogo)
├── components/      # app UI
├── lib/
├── platform/
├── stores/
├── types/
└── vfs/
```

## Cue types

| Type | Source |
|------|--------|
| **Audio** | Drag/import WAV, MP3, etc. |
| **Video** | Drag/import MP4, WebM, etc. |
| **Image** | Drag/import PNG, JPG, WebP, etc. |
| **Wait** | Timed pause between steps (no media). Runs when placed inside a **sequence**; add from **+ Cue** and drag where you want it. |
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
