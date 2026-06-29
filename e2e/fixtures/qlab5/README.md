# QLab 5 import fixtures

Synthetic QLab 5-style NSKeyedArchiver workspaces for parser and import tests.

## Regenerate

```bash
node e2e/fixtures/qlab5/generate-keyed-archive.mjs
```

On macOS this also writes a binary `GSC Import Fixture.qlab5` via `plutil`.

## Layout

- `minimal/decoded-workspace-root.json` — decoded workspace object (pre-keyed-archive)
- `minimal/minimal-workspace.json` — keyed archive JSON (`$objects`, `$top`)
- `minimal/GSC Import Fixture.qlab5` — binary workspace (macOS only)
- `minimal/audio/`, `minimal/video/` — sample media referenced by cues

Replace or extend these with real QLab 5 project dumps (`plutil -convert json`) as you validate against production workspaces.
