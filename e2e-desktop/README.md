# Desktop e2e (Tauri + WebDriver)

Official [Tauri WebDriver](https://v2.tauri.app/develop/tests/webdriver/) tests for the native app, using **WebdriverIO** and `tauri-driver`.

## Platform support

| OS | Desktop e2e |
|----|-------------|
| **Linux** | Supported (`webkit2gtk-driver`) |
| **Windows** | Supported (Edge WebDriver matching Edge version) |
| **macOS** | **Not supported** by Tauri WebDriver (no WKWebView driver). Use `npm run tauri:dev` manually and keep running Playwright web e2e. |

The config exits early on macOS so local `npm test` does not fail.

## Prerequisites

```bash
cargo install tauri-driver --locked
```

**Linux (Debian/Ubuntu CI):**

```bash
sudo apt-get install -y webkit2gtk-driver
```

**Windows:** install [Microsoft Edge WebDriver](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/) matching your Edge version.

**Fixtures:**

```bash
npm run test:e2e:fixtures
```

## Run

```bash
npm run test:e2e:desktop
```

This builds a debug Tauri binary (`src-tauri/target/debug/gsc`), starts `tauri-driver`, and runs specs in `e2e-desktop/specs/`.

## Shared scenarios

Desktop specs reuse the same scenario code as Playwright via `e2e/shared/`:

- `e2e/shared/driver.ts` — `AppDriver` interface
- `e2e/shared/scenarios/` — cross-platform test flows
- `e2e/adapters/playwright-driver.ts` — Playwright backend
- `e2e/adapters/wdio-driver.ts` — WebdriverIO backend

Example: `smoke-go-plays-audio` runs from:

- Web: `e2e/smoke.spec.ts` (Playwright)
- Desktop: `e2e-desktop/specs/smoke-go.e2e.ts` (WebdriverIO)

## Adding tests

1. Add or extend a scenario in `e2e/shared/scenarios/`.
2. Call it from a Playwright spec with `createPlaywrightDriver(page)`.
3. Call it from a desktop spec with `createWdioDriver(browser)`.
4. Keep **desktop-only** flows (save `.gsc` folder, unsaved dialog, recents) in `e2e-desktop/specs/` only.

Run on `ubuntu-latest` in CI (see `.github/workflows/ci.yml` and `release.yml`):

```yaml
- uses: ./.github/actions/desktop-e2e
```

Prerequisites are installed by that action (`webkit2gtk-driver`, `xvfb`, `tauri-driver`, Rust).

**Local Linux:**

```bash
sudo apt-get install -y webkit2gtk-driver xvfb
cargo install tauri-driver --locked
npm run test:e2e:fixtures
xvfb-run npm run test:e2e:desktop
```
