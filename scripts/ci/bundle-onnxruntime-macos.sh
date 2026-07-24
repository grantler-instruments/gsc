#!/usr/bin/env bash
# Bundle Microsoft ONNX Runtime into a Tauri .app for Intel Mac, then optionally
# re-sign / notarize / staple and refresh GitHub Release assets.
#
# Required env:
#   ORT_LIB_LOCATION  - directory containing libonnxruntime*.dylib
#
# Optional env:
#   RE_SIGN=true       - re-codesign, notarize, staple (needs Apple creds below)
#   UPLOAD_ASSETS=true - rebuild DMG/tar and gh release upload --clobber
#   RELEASE_TAG        - GitHub release tag (required when UPLOAD_ASSETS=true)
#   APPLE_SIGNING_IDENTITY, APPLE_ID, APPLE_PASSWORD, APPLE_TEAM_ID (when RE_SIGN=true)
set -euo pipefail

if [[ -z "${ORT_LIB_LOCATION:-}" ]]; then
  echo "ORT_LIB_LOCATION is not set" >&2
  exit 1
fi

APP=$(find src-tauri/target -type d -name "Grantler Stage Control.app" | head -1)
if [[ -z "$APP" ]]; then
  echo "Could not locate built .app bundle" >&2
  exit 1
fi

echo "Bundling ONNX Runtime into: $APP"
FRAMEWORKS_DIR="$APP/Contents/Frameworks"
mkdir -p "$FRAMEWORKS_DIR"
cp -a "${ORT_LIB_LOCATION}"/libonnxruntime*.dylib "$FRAMEWORKS_DIR/"
# Copy real dylib + any versioned siblings; skip broken symlinks if present.
chmod +x "$FRAMEWORKS_DIR"/libonnxruntime*.dylib 2>/dev/null || true

# Tauri names the .app from productName, but the Mach-O is usually the Cargo
# package name (e.g. "gsc"), not "Grantler Stage Control".
MACOS_DIR="$APP/Contents/MacOS"
if [[ ! -d "$MACOS_DIR" ]]; then
  echo "Missing Contents/MacOS in $APP" >&2
  ls -la "$APP/Contents" >&2 || true
  exit 1
fi
echo "Contents/MacOS:"
ls -la "$MACOS_DIR"

APP_BIN=""
# Prefer CFBundleExecutable from Info.plist when present.
if [[ -f "$APP/Contents/Info.plist" ]]; then
  EXEC_NAME=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$APP/Contents/Info.plist" 2>/dev/null || true)
  if [[ -n "${EXEC_NAME:-}" && -f "$MACOS_DIR/$EXEC_NAME" ]]; then
    APP_BIN="$MACOS_DIR/$EXEC_NAME"
  fi
fi
# Fallback: first executable Mach-O in MacOS/ (ignore helpers if any).
if [[ -z "$APP_BIN" ]]; then
  while IFS= read -r candidate; do
    if [[ -f "$candidate" && -x "$candidate" ]]; then
      APP_BIN="$candidate"
      break
    fi
  done < <(find "$MACOS_DIR" -maxdepth 1 -type f -perm -111 | sort)
fi
if [[ -z "$APP_BIN" || ! -f "$APP_BIN" ]]; then
  echo "Could not locate app binary under $MACOS_DIR" >&2
  exit 1
fi
echo "Using app binary: $APP_BIN"

# Add rpath if missing (idempotent). Signed binaries must be unsigned first.
if ! otool -l "$APP_BIN" | grep -q '@executable_path/../Frameworks'; then
  if codesign -d "$APP_BIN" &>/dev/null; then
    echo "Removing existing code signature before install_name_tool"
    codesign --remove-signature "$APP" || true
  fi
  install_name_tool -add_rpath @executable_path/../Frameworks "$APP_BIN"
fi

echo "Frameworks contents:"
ls -la "$FRAMEWORKS_DIR/"

if [[ "${RE_SIGN:-}" == "true" ]]; then
  : "${APPLE_SIGNING_IDENTITY:?APPLE_SIGNING_IDENTITY required when RE_SIGN=true}"
  : "${APPLE_ID:?APPLE_ID required when RE_SIGN=true}"
  : "${APPLE_PASSWORD:?APPLE_PASSWORD required when RE_SIGN=true}"
  : "${APPLE_TEAM_ID:?APPLE_TEAM_ID required when RE_SIGN=true}"

  ENTITLEMENTS="src-tauri/entitlements.plist"
  if [[ ! -f "$ENTITLEMENTS" ]]; then
    echo "Missing entitlements at $ENTITLEMENTS" >&2
    exit 1
  fi

  echo "Re-signing dylibs and app with: $APPLE_SIGNING_IDENTITY"
  for dylib in "$FRAMEWORKS_DIR"/libonnxruntime*.dylib; do
    codesign --force --options runtime --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$dylib"
  done

  codesign --force --deep --options runtime --timestamp \
    --entitlements "$ENTITLEMENTS" \
    --sign "$APPLE_SIGNING_IDENTITY" \
    "$APP"

  codesign --verify --deep --strict --verbose=2 "$APP"

  ZIP_PATH="${RUNNER_TEMP:-/tmp}/gsc-intel-mac-notarize.zip"
  rm -f "$ZIP_PATH"
  ditto -c -k --keepParent "$APP" "$ZIP_PATH"

  echo "Submitting for notarization..."
  xcrun notarytool submit "$ZIP_PATH" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" \
    --wait

  xcrun stapler staple "$APP"
  xcrun stapler validate "$APP"
  spctl -a -vvv --type execute "$APP"
else
  echo "Skipping re-sign/notarize (RE_SIGN!=true)"
fi

if [[ "${UPLOAD_ASSETS:-}" != "true" ]]; then
  echo "Skipping asset refresh (UPLOAD_ASSETS!=true)"
  exit 0
fi

: "${RELEASE_TAG:?RELEASE_TAG required when UPLOAD_ASSETS=true}"

# APP is typically .../bundle/macos/Foo.app → bundle root is .../bundle
if [[ "$(basename "$(dirname "$APP")")" == "macos" ]]; then
  BUNDLE_ROOT=$(dirname "$(dirname "$APP")")
else
  BUNDLE_ROOT=$(dirname "$APP")
fi

echo "Refreshing release archives under: $BUNDLE_ROOT"
shopt -s nullglob
DMGS=("$BUNDLE_ROOT"/dmg/*.dmg "$BUNDLE_ROOT"/*.dmg)
MACOS_TARS=("$BUNDLE_ROOT"/macos/*.tar.gz "$BUNDLE_ROOT"/*.app.tar.gz)

for tar_path in "${MACOS_TARS[@]}"; do
  if [[ -f "$tar_path" ]]; then
    # Resolve absolute path before packaging: we create the archive from a
    # temp dir, and a relative $tar_path would resolve under that temp dir.
    TAR_ABS="$(cd "$(dirname "$tar_path")" && pwd)/$(basename "$tar_path")"
    echo "Updating $TAR_ABS"
    TMP_TAR_DIR=$(mktemp -d)
    cp -R "$APP" "$TMP_TAR_DIR/"
    tar czf "$TAR_ABS" -C "$TMP_TAR_DIR" "Grantler Stage Control.app"
    rm -rf "$TMP_TAR_DIR"
  fi
done

for dmg in "${DMGS[@]}"; do
  if [[ -f "$dmg" ]]; then
    echo "Rebuilding $dmg"
    VOL_NAME="Grantler Stage Control"
    TMP_DMG_DIR=$(mktemp -d)
    cp -R "$APP" "$TMP_DMG_DIR/"
    rm -f "$dmg"
    hdiutil create -volname "$VOL_NAME" -srcfolder "$TMP_DMG_DIR" -ov -format UDZO "$dmg"
    rm -rf "$TMP_DMG_DIR"

    if [[ "${RE_SIGN:-}" == "true" ]]; then
      echo "Notarizing rebuilt DMG..."
      xcrun notarytool submit "$dmg" \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_PASSWORD" \
        --team-id "$APPLE_TEAM_ID" \
        --wait
      xcrun stapler staple "$dmg"
    fi
  fi
done

UPLOAD_FILES=()
for f in "${DMGS[@]}" "${MACOS_TARS[@]}"; do
  if [[ -f "$f" ]]; then
    UPLOAD_FILES+=("$f")
  fi
done

if ((${#UPLOAD_FILES[@]} > 0)); then
  echo "Uploading updated assets to release $RELEASE_TAG"
  gh release upload "$RELEASE_TAG" "${UPLOAD_FILES[@]}" --clobber
else
  echo "No DMG/tar assets found to re-upload; .app on disk is updated."
fi

echo "ONNX Runtime bundle complete."
