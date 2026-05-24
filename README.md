# Grantler Stage Control (GSC)

Web-based show playback for audio and video cues. Same codebase runs in the browser and as a Tauri desktop app.

**Live site (GitHub Pages):** https://grantler-instruments.github.io/gsc/  
**Web app:** https://grantler-instruments.github.io/gsc/app/

## Stack

- **Frontend:** React, TypeScript, Vite, Zustand, MUI
- **Desktop:** Tauri 2
- **Browser:** Virtual filesystem (drag-and-drop assets), browser storage + `.gsc.zip` bundles

## Development

```bash
npm install
npm run dev
npm run lint       # check format + lint
npm run lint:fix   # auto-fix where safe
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

Published URL: `https://grantler-instruments.github.io/gsc/`.

Push to `main` or run **Deploy to GitHub Pages** manually. The workflow builds with `VITE_BASE=/gsc/` and publishes `dist/`.

The GitHub repository should be named **`gsc`** so Pages serves at that path (Settings → General → Repository name).

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

See **[docs/architecture.md](docs/architecture.md)** for how playback, stores, and platform code fit together.

## Cue types

| Type | Source |
|------|--------|
| **Audio** | Drag/import WAV, MP3, etc. |
| **Video** | Drag/import MP4, WebM, etc. |
| **Image** | Drag/import PNG, JPG, WebP, etc. |
| **Wait** | Timed pause between steps (no media). Runs when placed inside a **sequence**; add from **+ Cue** and drag where you want it. |
| **MIDI** | **Out:** **+ Cue → MIDI**, GO sends to **Settings → MIDI output**. **In:** **Settings → MIDI map** to bind incoming notes/CCs to GO, select cue, panic, etc. |

## .gsc projects

### Desktop project (`.gsc` folder)

Native desktop projects are **package directories** named `ShowName.gsc`. In Finder they appear as a single file; inside:

```
MyShow.gsc/
├── project.json    # cues, fixtures, MIDI maps, etc.
└── assets/         # media files
    ├── intro.wav
    └── clip.mp4
```

- **New project (⌘N):** pick a location and name — GSC creates `ShowName.gsc/` and autosaves there.
- **Double-click** a `.gsc` project in Finder to open it in GSC (requires the installed `.app`).
- **Open…:** select a `.gsc` folder, or import a `.gsc.zip` bundle (extracted into a new `.gsc` folder).
- **Drag-and-drop:** drop a `.gsc` folder or `.gsc.zip` onto the window to open/import.

### Web project

The web app autosaves to browser storage. Use **Open…** / **Export…** to import or download a `.gsc.zip` bundle (with media) when moving shows between machines or backing up.

### Portable bundle (`.gsc.zip`)

Zip archive with the same layout as a desktop project — used to share or back up a show:

```
MyShow.gsc.zip
├── project.json
└── assets/
```

- **Web:** File → Open… / Export…
- **Desktop:** File → Export…, or Open… to import a bundle into a new `.gsc` folder

## Contributing

Bug reports and pull requests are welcome.

1. Open an issue for bugs or ideas, or discuss before a large change.
2. Fork the repo, create a branch, and run `npm install` / `npm run dev` locally.
3. Open a pull request against `main` with a clear description of the change.

By contributing, you agree that your contributions will be licensed under the same terms as this project ([AGPL-3.0-or-later](LICENSE)).

## License

Copyright © 2026 Grantler Instruments.

This project is licensed under the **GNU Affero General Public License v3.0 or later** ([AGPL-3.0](LICENSE)). You may use, modify, and distribute it under those terms.

If you distribute this software or run a modified version as a network service, you must make the corresponding source available under the same license. See [LICENSE](LICENSE) for the full text.
