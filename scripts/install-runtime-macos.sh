#!/usr/bin/env bash
set -euo pipefail

APP_SUPPORT_DIR="${HOME}/Library/Application Support/WhisprType"
RUNTIME_DIR="${APP_SUPPORT_DIR}/runtime/whispercpp"
MODELS_DIR="${APP_SUPPORT_DIR}/models"

mkdir -p "${RUNTIME_DIR}" "${MODELS_DIR}"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is not installed."
  echo "Install it from https://brew.sh/ and run this script again."
  exit 1
fi

for formula in whisper-cpp sox; do
  if ! brew list "${formula}" >/dev/null 2>&1; then
    echo "==> Installing ${formula}"
    brew install "${formula}"
  fi
done

for binary in whisper-server whisper-cli rec sox; do
  path="$(command -v "${binary}" || true)"
  if [[ -z "${path}" ]]; then
    echo "Missing binary after install: ${binary}"
    exit 1
  fi
  ln -sf "${path}" "${RUNTIME_DIR}/${binary}"
done

echo "Runtime ready at:"
echo "  ${RUNTIME_DIR}"
echo
echo "Model directory:"
echo "  ${MODELS_DIR}"
