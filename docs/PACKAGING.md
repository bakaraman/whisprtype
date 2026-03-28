# Packaging

## Release targets

- macOS `.app` bundle
- macOS `.dmg` (requires `create-dmg`)

## Source build prerequisites

- macOS 13+
- Xcode Command Line Tools
- Rust toolchain
- Node.js 20+

## Build

```bash
npm install
npm run build
npm run tauri build
```

Output: `src-tauri/target/release/bundle/macos/WhisprType.app`

## Runtime prerequisites for end users

The app itself does not bundle whisper.cpp or SoX. Users must install them before using the in-app bootstrap:

```bash
brew install whisper-cpp sox
```

The bootstrap button in the Dictation tab symlinks `whisper-server`, `whisper-cli`, `rec`, and `sox` from the system PATH into the app's runtime directory.

## First-run flow

1. Install WhisprType (drag to /Applications or run from source)
2. Launch the app
3. Click Bootstrap on the Dictation tab to link runtime binaries
4. Select and download a whisper model from the Dictation tab
5. Grant Microphone and Accessibility permissions when prompted
6. Start dictating

## Scripts

- `scripts/bootstrap-macos.sh` -- checks for dev prerequisites (Xcode CLT, Node, Rust)
- `scripts/install-runtime-macos.sh` -- installs whisper-cpp and sox via Homebrew, creates symlinks
- `scripts/install-latest-macos.sh` -- downloads latest GitHub release and installs to /Applications
