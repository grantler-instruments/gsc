# Grantler Stage Control (GSC)

Web-based show playback for audio and video cues. Same codebase runs in the browser and as a Tauri desktop app.

**Live site (GitHub Pages):** https://grantler-instruments.github.io/gsc/  
**Web app:** https://grantler-instruments.github.io/gsc/app/

## Stack

- **Frontend:** React, TypeScript, Vite, Zustand, MUI
- **Desktop:** Tauri 2
- **Browser:** Virtual filesystem (drag-and-drop assets), browser storage + `.gsc.zip` bundles

## Features

- Cue-based playback for audio, video, images, MIDI, OSC, DMX, and utility cues
- Portable project workflows with `.gsc` desktop projects and `.gsc.zip` bundles
- Audience output window plus **Remote View** for monitoring playback from another device

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

Opens **http://localhost:1421/gsc/app/** (port **1421**).

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

### Media

| Type | Description |
|------|-------------|
| **Audio** | Drag/import WAV, MP3, etc. Trim in/out, fades, loop, volume, and pan. |
| **Video** | Drag/import MP4, WebM, etc. Preview and audience output with trim and fades. |
| **Image** | Drag/import PNG, JPG, WebP, etc. Shown on the output window. |

### Output

| Type | Description |
|------|-------------|
| **MIDI** | **Out:** **+ Cue → MIDI**, GO sends note/CC/program change to **Settings → MIDI output**. **In:** **Settings → MIDI map** to bind incoming notes/CCs to GO, select cue, panic, etc. |
| **OSC** | **+ Cue → OSC** sends Open Sound Control messages on GO (destination, address, arguments). Desktop app only. |
| **Light** | DMX fixture control — patch fixtures, program levels or snapshots, and preview in the fixture plot. Desktop app only. |

### Structure

| Type | Description |
|------|-------------|
| **Sequence** | Container that runs child steps in order; each step can hold parallel cues, with **wait** cues between steps. |
| **Parallel** | Container that fires every child cue at the same time on GO. |

### Utility & fades

| Type | Description |
|------|-------------|
| **Wait** | Timed pause before the next sequence step. Add from **+ Cue** inside a sequence. |
| **Stop** | Stops a specific running cue (or create from a media cue’s context menu). |
| **Volume fade** | Fades audio level on a target audio or video cue over time. |
| **Opacity fade** | Fades opacity on a target image or video cue. |
| **Pan fade** | Fades stereo pan on a target audio or video cue. |
| **Light fade** | Fades DMX levels toward a target light cue over time. |

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

**Experimental QLab 5 import:** GSC can also import QLab 5 workspaces through the same **Open…** flow (no separate menu item). Choose a `.qlab5` file, or on desktop a project folder that contains one. GSC shows a confirmation dialog and an import report when done. Coverage is incomplete — treat imported shows as a starting point and review cues, fades, and media before relying on them in production.

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

## NDI output (desktop)

The Tauri app can publish the **output window** as an NDI® source for OBS, vMix, Resolume, and other NDI tools on your LAN.

1. Install the [NDI SDK](https://ndi.video/sdk/) for your platform (macOS: run the `.pkg` installer).
2. Tell Cargo where the SDK was installed. After install, check which folder exists, e.g. `/Library/NDI 6 SDK`. Then either:
   - Copy `src-tauri/.cargo/config.toml.example` to `src-tauri/.cargo/config.toml` and set `NDI_SDK_DIR`, or
   - Export for one shell session: `export NDI_SDK_DIR="/Library/NDI 6 SDK"`
3. Build or run with the Rust feature enabled:
   ```bash
   npm run tauri:dev:ndi
   ```
   Release builds: `npm run tauri build -- --features ndi`
4. In **Settings → Video**, enable **NDI program output**, set a source name, and open the **output window** from the toolbar.

Frames are composited in the output webview and sent via `grafton-ndi`. If the SDK is missing, the app still builds without `--features ndi`; Settings will show that NDI is unavailable.

NDI® is a registered trademark of Vizrt NDI AB. See [ndi.video](https://ndi.video/) for SDK license terms.

## Remote control (desktop)

The desktop app can host a **remote control** session on your local network so phones or tablets can fire cues in show mode.

See **[docs/remote.md](docs/remote.md)** for architecture and implementation details.

1. Open **Settings → Remote** in the desktop app and click **Start remote**.
2. Scan the **QR code** or open the connect URL on another device on the same Wi‑Fi.
3. The remote opens in **show mode** — GO, panic, cue selection, and master volume control the booth computer.

You can set a fixed **6-digit PIN** in Settings so it stays stable across app restarts. Optional **auto-start** can bring the remote server up automatically on launch.

**Audio, video, and image cues** always play on the **booth computer** (output window, speakers, DMX, MIDI, etc.). The remote syncs show state from host snapshots (project/selection/transport/playback/fixture-plot). Missing-asset warnings are hidden on the remote because files are expected to live on the host project.

The **fixture plot** (sidebar and expanded above the cue list) mirrors the booth: DMX preview toggles, expand/collapse, and live fixture levels are included in the remote snapshot.

**Media assets** (audio, video, images) are fetched from the booth over HTTP (`GET /remote/asset?path=…&pin=…` on the same port as the WebSocket). The remote uses them for waveforms, thumbnails, and previews — playback still runs only on the host. Open the project on the booth before connecting a remote so files can be served from disk.

**Development (`tauri dev`):** the QR code points at the **Vite dev server** (port 1421) so you get live reload without rebuilding `dist/`. The Rust server on the remote port handles **WebSocket + remote asset HTTP**.

**Production:** the remote port serves the built UI from `dist/` plus WebSocket on the same port.

Remote control is **desktop-only**; the web app does not host remote sessions.

## macOS releases (signing & notarization)

Tag pushes (`x.y.z`) build desktop artifacts via [`.github/workflows/release.yml`](.github/workflows/release.yml) and [`tauri-apps/tauri-action`](https://github.com/tauri-apps/tauri-action). On macOS, the workflow signs and notarizes through Tauri’s bundler ([docs](https://v2.tauri.app/distribute/sign/macos/)).

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` (Developer ID Application) |
| `APPLE_CERTIFICATE_PASSWORD` | Password used when exporting the `.p12` |
| `KEYCHAIN_PASSWORD` | Random string for the ephemeral CI keychain |
| `APPLE_ID` | Apple ID email |
| `APPLE_PASSWORD` | App-specific password ([appleid.apple.com](https://appleid.apple.com)) |
| `APPLE_TEAM_ID` | 10-character Team ID from the developer portal |

Use a **Developer ID Application** certificate (direct download releases), not “Apple Distribution” (App Store).

If you already use NeopixelBlocks secrets, reuse the same certificate values; create `APPLE_PASSWORD` with the same value as `APPLE_APP_SPECIFIC_PASSWORD` (Tauri expects the name `APPLE_PASSWORD`).

Without these secrets, macOS jobs still build but releases stay unsigned (Gatekeeper may report the app as “damaged”).

## Contributing

Bug reports and pull requests are welcome.

1. Open an issue for bugs or ideas, or discuss before a large change.
2. Fork the repo, create a branch, and run `npm install` / `npm run dev` locally.
3. Open a pull request against `main` with a clear description of the change.

By contributing, you agree that your contributions will be licensed under the same terms as this project ([AGPL-3.0-or-later](LICENSE)).

## Support

If you find GSC useful, you can support development:

[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/thomasgeissl)

## License

Copyright © 2026 Grantler Instruments.

This project is licensed under the **GNU Affero General Public License v3.0 or later** ([AGPL-3.0](LICENSE)). You may use, modify, and distribute it under those terms.

If you distribute this software or run a modified version as a network service, you must make the corresponding source available under the same license. See [LICENSE](LICENSE) for the full text.
