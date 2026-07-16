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
chmod +x "$FRAMEWORKS_DIR"/libonnxruntime*.dylib

APP_BIN="$APP/Contents/MacOS/Grantler Stage Control"
if [[ ! -f "$APP_BIN" ]]; then
  echo "Could not locate app binary at $APP_BIN" >&2
  exit 1
fi

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

for tar in "${MACOS_TARS[@]}"; do
  if [[ -f "$tar" ]]; then
    echo "Updating $tar"
    TMP_TAR_DIR=$(mktemp -d)
    cp -R "$APP" "$TMP_TAR_DIR/"
    (
      cd "$TMP_TAR_DIR"
      tar czf "$tar" "Grantler Stage Control.app"
    )
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
