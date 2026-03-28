#!/usr/bin/env bash
set -euo pipefail

REPO="${WHISPRTYPE_REPO:-batuhankaraman/whisprtype}"
API_URL="https://api.github.com/repos/${REPO}/releases/latest"
TMP_DIR="$(mktemp -d)"
ASSET_PATH="${TMP_DIR}/WhisprType.zip"

cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

echo "==> Fetching latest WhisprType release from ${REPO}"

DOWNLOAD_URL="$(
  curl -fsSL "${API_URL}" |
    python3 -c '
import json, sys
payload = json.load(sys.stdin)
assets = payload.get("assets", [])
preferred = None
for asset in assets:
    name = asset.get("name", "")
    if name.endswith(".zip") or name.endswith(".app.tar.gz"):
        preferred = asset.get("browser_download_url")
        break
if not preferred:
    raise SystemExit("No macOS release asset found.")
print(preferred)
)'
)"

echo "==> Downloading ${DOWNLOAD_URL}"
curl -fL "${DOWNLOAD_URL}" -o "${ASSET_PATH}"

echo "==> Extracting to ${TMP_DIR}"
ditto -x -k "${ASSET_PATH}" "${TMP_DIR}/app" 2>/dev/null || true

APP_PATH="$(find "${TMP_DIR}" -name 'WhisprType.app' -maxdepth 3 | head -n 1)"
if [[ -z "${APP_PATH}" ]]; then
  echo "Could not find WhisprType.app after extraction."
  exit 1
fi

echo "==> Installing to /Applications"
rm -rf /Applications/WhisprType.app
cp -R "${APP_PATH}" /Applications/WhisprType.app

echo "==> Done"
echo "Launch it with: open /Applications/WhisprType.app"
