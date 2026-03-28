#!/usr/bin/env bash
set -euo pipefail

echo "==> WhisprType macOS bootstrap"

check() {
  local label="$1"
  local command_name="$2"
  if command -v "$command_name" >/dev/null 2>&1; then
    echo "  [ok] $label"
  else
    echo "  [missing] $label"
  fi
}

check "Xcode Command Line Tools" xcode-select
check "Node.js" node
check "npm" npm
check "Rust" rustc
check "Cargo" cargo

echo
echo "Recommended next steps:"
echo "  1. Install missing prerequisites."
echo "  2. Run: npm install"
echo "  3. Run: npm run tauri dev"
echo
echo "Official references:"
echo "  - Tauri prerequisites: https://tauri.app/start/prerequisites/"
echo "  - Rust install: https://www.rust-lang.org/tools/install"
