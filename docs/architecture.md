# GSC architecture

This document describes how the show-control app is structured and how playback works. Read it before changing GO behavior, adding cue types, or wiring new output engines.

## Entry points

The repo builds two Vite entries from one codebase:

| Entry | HTML | Purpose |
|-------|------|---------|
| Website | `index.html` | Marketing site (`src/website/`) |
| App | `app/index.html` | Show control (`src/app/main.tsx` → `App.tsx`) |

`src/app/main.tsx` also mounts a separate **output window** (`OutputApp`) when opened in output mode — used for full-screen visual monitoring.

## Layer overview

```
src/
├── app/           Bootstrap for the show-control app
├── website/       Marketing site (no stores / engines)
├── types/         Shared TypeScript models (Cue, Fixture, …)
├── lib/           Pure domain logic — no React, minimal side effects
├── stores/        Zustand state (project, transport, UI, …)
├── hooks/         Runtime wiring: subscribe stores → run engines
├── components/    React UI, grouped by feature
├── platform/      Web vs Tauri facades (*.web.ts / *.tauri.ts)
├── audio/         Web Audio engine (Elementary)
├── vfs/           Virtual filesystem for in-browser assets
└── theme/         MUI theme and design tokens
```

**Rule of thumb:** business rules live in `lib/`, mutable app state in `stores/`, side effects that connect state to hardware/audio in `hooks/`, and platform I/O behind `platform/` facades.

## Stores

| Store | File | Owns |
|-------|------|------|
| **Project** | `stores/project/` | Cue lists, cues, fixtures, fixture plot, MIDI mappings, selection, snapshot import/export. Split into action modules (`cue-editor-actions`, `cue-list-actions`, …). |
| **Transport** | `stores/transport.ts` | What is *playing right now*: `activeCueIds`, `cueStartedAtMs`, `runningSequence`, master volume. `go` / `goMany` / `stopMany` / `panic` update this state only — they do not send MIDI or start audio directly. |
| **Playback** | `stores/playback.ts` | Derived UI progress (scrub position, per-cue playback bounds). Updated by `usePlaybackProgress`. |
| **Fade** | `stores/fade.ts` | Active volume/opacity/light fades and DMX fade plans. |
| **UI** | `stores/ui.ts` | Show mode, sidebars, dialogs, collapsed groups. |
| **Preferences** | `stores/preferences.ts` | MIDI/OSC/DMX device settings (persisted). |
| **VFS** | `stores/vfs.ts` | In-memory virtual filesystem mirror for web projects. |
| **Notifications** | `stores/notifications.ts` | Snackbar queue for user-visible errors. |
| **Project location** | `stores/project-location.ts` | Desktop `.gsc` project directory path. |
| **DMX preview session** | `stores/dmx-preview-session.ts` | Temporary DMX preview state in the inspector. |

The **transport store is intentionally dumb.** It records which cues are active and when each was triggered. Output engines *react* to transport changes rather than being called from `go()` directly.

## Playback pipeline

### High-level GO flow

```
User action (GO button, keyboard, MIDI map)
  │
  ▼
lib/transport-actions.ts     triggerGoAndAdvance / triggerGoSelected
  │
  ▼
lib/trigger.ts               triggerGo — branch by cue type
  │
  ├── stop cue      → triggerStopCue → transport.stopMany
  ├── wait cue      → no-op (handled inside sequences)
  ├── fade cue      → lib/trigger-fade.ts → fade store (bypasses transport)
  ├── sequence      → lib/sequence-runner.ts → fireStepCues per step
  ├── parallel grp  → lib/parallel-group-fire.ts → transport.goMany
  └── leaf cue      → transport.go(cueId)
  │
  ▼
Engine hooks (subscribe to transport / fade / project)
  │
  ├── useAudioEngine      → audio/engine.ts (audio/video cues)
  ├── useMidiEngine       → platform/send-midi.ts
  ├── useOscEngine        → platform/send-osc.ts
  ├── useDmxEngine        → platform/send-dmx.ts
  ├── useDmxFadeEngine    → DMX fade frames during light fades
  └── useFadeAnimation    → volume/opacity interpolation each frame
  │
  ▼
Platform facades → Web MIDI / Tauri invoke / Web Audio / etc.
```

After GO, `triggerGoAndAdvance` also calls `selectNextCueAfterGo` (`lib/cue-navigation.ts`) to move the editor selection.

### Why transport + engines?

Decoupling keeps `triggerGo` testable without mocking audio or MIDI. Unit tests pass fake `go` / `goMany` / `stopMany` actions and assert which cue IDs would become active.

Engine hooks follow the same pattern:

1. Subscribe to `useTransportStore` (and sometimes `useProjectStore` or `useFadeStore`).
2. Compare previous vs next state with a small selector (see `hooks/transport-cue-sync.ts`).
3. Call `syncCueTriggerEngine` (`lib/cue-trigger-engine-sync.ts`) — fires output once per `(cueId, cueStartedAtMs)` pair and clears dedup state when a cue leaves the active set.

Audio is slightly different: `useAudioEngine` calls `audioEngine.sync(activeCueIds, cues, …)` and also re-syncs when cue data or fade levels change.

### Sequences

Sequences are container cues whose children run in **steps** (sibling order inside the sequence group).

```
lib/sequence-runner.ts
  runSequence(rootCue)
    → expandSequenceSteps → steps: string[][]
    → runSequenceStep for each step
         → fireStepCues (lib/fire-step-cues.ts)
         → scheduleSequenceStep timer (lib/sequence-timers.ts)
         → advanceRunningSequence when step completes
```

`fireStepCues` handles mixed steps: stops, waits, fades, nested sequences/parallel groups, and leaf playback cues. Leaf IDs are collected and passed to `transport.goMany` in one batch so they start together.

`transport.runningSequence` tracks the current step for UI (progress, wait indicators). `usePlaybackProgress` reads it for sequence wait timing.

### Fades

Fade cues (`volumeFade`, `opacityFade`, `lightFade`) **do not** go through transport. `triggerFadeCue` writes directly to `useFadeStore`:

- **Volume / opacity** — `useFadeAnimation` ticks the fade store each frame; `useAudioEngine` and visual output hooks read effective levels via `resolveEffectiveVolume` / `resolveEffectiveOpacity`.
- **Light (DMX)** — `useDmxFadeEngine` sends interpolated universes; `finalizeLightFade` commits final levels when the fade completes.

### Stop and panic

| Action | Path |
|--------|------|
| Stop cue | `transport.stopCue` — engines see cue leave `activeCueIds` |
| Stop all | `transport.stop` — clears active set and running sequence |
| Panic | `transport.panic` — stop + `fadeStore.clearAllFades` + sequence cancel |

Stop *cues* resolve their target (single cue, group, or sequence) via `lib/cues.ts` helpers and call `transport.stopMany` with the expanded ID list.

## Runtime bootstrap

`App.tsx` waits for `useAppRuntime()` before rendering. That hook composes side-effect hooks in three groups:

| Group | Hooks | Role |
|-------|-------|------|
| **Session** | `useProjectSession` | Restore last project; debounced autosave on project/VFS/location changes |
| **Engines** | `useAudioEngine`, `useMidiEngine`, `useOscEngine`, `useDmxEngine`, `useDmxFadeEngine`, `useCueDmxPreview`, `useFadeAnimation`, `useOutputPublisher`, `usePlaybackProgress` | Connect transport/fade state to outputs and UI progress |
| **Input / platform** | `useAppKeyboard`, `useMidiInput`, `usePreventBrowserFileDrop`, `useTauriAppMenu`, `useEnttecProConnection` | Keyboard shortcuts, incoming MIDI, file drops, native menu, Enttec Pro USB |

Hooks in the engines group are **order-independent** — each subscribes to stores on mount. Do not assume one engine has run before another unless you add an explicit dependency.

`useProjectSession` returns `ready: false` until restore finishes; the app renders nothing until then to avoid flashing empty state.

## Platform abstraction

Web and Tauri share one tree. Platform-specific code lives in paired files:

```
platform/send-midi.ts          ← facade (dynamic import)
platform/send-midi.web.ts      ← Web MIDI
platform/send-midi.tauri.ts    ← Tauri invoke
```

**Always import the facade** (`platform/send-midi.ts`), never `.web.ts` or `.tauri.ts` directly from feature code. Facades use `getPlatform()` from `platform/index.ts` to branch at runtime.

The Rust layer (`src-tauri/`) is thin: list devices, send MIDI/DMX/OSC, serial (Enttec Pro), native menus. Business logic stays in TypeScript.

## Project persistence

| Platform | Storage | Module |
|----------|---------|--------|
| Web | `localStorage` + Cache API for assets | `platform/project-storage.web.ts` |
| Tauri | `.gsc` project directories on disk; `.gsc.zip` bundles for import/export | `platform/project-storage.tauri.ts` |

Project shape is defined in `lib/project-snapshot.ts` (`ProjectSnapshotV2`). Bundles add an `assets/` media folder via `lib/project-bundle.ts`. The VFS (`vfs/`) maps asset paths like `/assets/audio/intro.wav` to blobs or disk files depending on platform.

## UI structure

`App.tsx` layout:

```
ProjectToolbar
├── LeftSidebar        (assets, fixtures, MIDI map, …)
├── CueList            (components/cue-list/ — tree, drag-drop, selection)
├── RightSidebar       (fixture plot when fixtures exist)
│   or CueInspector    (when a cue is selected and no fixtures)
TransportBar
SettingsDialog, DmxPreviewConfirmDialog, AppSnackbar
```

Large features are split into subfolders (`cue-list/`, `cue-inspector/`, `active-cues/`). Top-level files like `components/CueList.tsx` are thin re-exports for stable import paths.

## Adding a new cue type

Use this checklist when introducing a cue type (e.g. a new output or utility cue):

1. **Type** — Add to `CueType` and any payload interface in `src/types/cue.ts`.
2. **Classification helpers** — Add `isXxxCue` / routing helpers in `src/lib/cues.ts` if the type needs special handling (utility, container, playback, etc.).
3. **Trigger behavior** — Update `src/lib/trigger.ts` (`triggerGo`) and, if it can appear inside sequences, `src/lib/fire-step-cues.ts`.
4. **Transport vs direct** — Decide:
   - **Transport-backed** (like audio, MIDI, OSC, DMX): `triggerGo` calls `transport.go(id)`; add or extend an engine hook that fires when the cue enters `activeCueIds`.
   - **Direct** (like fades): call the relevant store or platform API from `triggerGo` / `triggerFadeCue` without going through transport.
5. **Engine hook** — If transport-backed, add `useXxxEngine` following `useMidiEngine` (subscribe + `cueStartedAtMs` dedup). Register it in `useAppRuntime`.
6. **Platform** — If output goes to hardware/network, add `platform/send-xxx.ts` facade + `.web.ts` / `.tauri.ts` implementations.
7. **Inspector UI** — Add fields under `components/cue-inspector/` and wire into `CueInspectorBody.tsx`.
8. **Cue list UI** — Icon in `CueTypeIcon.tsx`; row details in `CueRowDetails.tsx` if needed.
9. **Store actions** — Extend `cue-editor-actions.ts` for create/update defaults.
10. **Tests** — Unit tests in `src/lib/` for trigger/sequence behavior; mirror patterns in `trigger.test.ts` and `fire-step-cues.test.ts`.
11. **Snapshot** — Ensure the cue serializes in `project-snapshot.ts` (usually automatic if fields live on `Cue`).

## Testing

- **Unit tests** — `src/**/*.test.ts`, run with `npm test`. Focus on `lib/` (trigger, sequences, DMX, project I/O).
- **Lint/format** — [Biome](https://biomejs.dev/) via `npm run lint` / `npm run lint:fix`.
- **CI** — `.github/workflows/ci.yml` runs typecheck, lint, build, and `vitest`.

## User-visible errors

Use `lib/notifications.ts` (`notifyError`, `notifyWarning`, `notifyErrorFromUnknown`, `notifyWarningDeduped`) for failures the operator should see in the snackbar. Platform I/O (MIDI/OSC/DMX send, project save/restore, asset import) routes through these helpers; `console.*` is kept for diagnostics alongside some notifications.
- Engine hooks and React components are not yet covered by tests; when changing playback, prefer extending `lib/` tests over manual-only verification.

## Related files (quick reference)

| Concern | Start here |
|---------|------------|
| GO from UI | `components/cue-list/cueListActionsContext.tsx` |
| GO from keyboard | `hooks/useAppKeyboard.ts` |
| GO from MIDI | `lib/midi-mapping.ts` |
| Trigger logic | `lib/trigger.ts`, `lib/transport-actions.ts` |
| Sequence timing | `lib/sequence-runner.ts`, `lib/sequence-timers.ts` |
| Audio playback | `audio/engine.ts`, `hooks/useAudioEngine.ts` |
| Visual output window | `hooks/useOutputPublisher.ts`, `components/OutputApp.tsx` |
| Cue tree / reorder | `stores/project/cue-list-actions.ts`, `lib/cues.ts` |
