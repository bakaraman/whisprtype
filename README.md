# WhisprType

Local-first macOS dictation. Press a hotkey, speak, and the transcribed text lands in the active app.

Uses [whisper.cpp](https://github.com/ggml-org/whisper.cpp) for on-device transcription. No cloud required.

## What It Does

- Global hotkey starts and stops recording
- Transcribes locally with whisper.cpp
- Pastes finished text into the active app, copies to clipboard, or types it out
- Supports toggle and push-to-talk hotkey modes
- Finished transcripts can paste while another recording is still live

## Prerequisites

WhisprType requires whisper.cpp and SoX to be installed on the system before the in-app bootstrap can link them.

```bash
brew install whisper-cpp sox
```

macOS 13 or newer is required.

## Quick Start

### From source

```bash
git clone https://github.com/batuhankaraman/whisprtype.git
cd whisprtype
npm install
npm run tauri dev
```

Requires Rust toolchain and Node.js 20+. Run `./scripts/bootstrap-macos.sh` to check prerequisites.

### First run

1. Launch WhisprType
2. On the Dictation tab, click **Bootstrap** to link runtime binaries
3. Click **Download** to fetch the selected whisper model
4. Grant Microphone and Accessibility permissions when macOS prompts
5. Press the hotkey (default: `Cmd+Shift+Space`) to dictate

## Permissions

WhisprType needs two macOS permissions:

- **Microphone** -- macOS prompts on first recording attempt
- **Accessibility** -- required for paste/type automation. Grant in System Settings > Privacy & Security > Accessibility

See [docs/PERMISSIONS.md](./docs/PERMISSIONS.md).

## Hotkeys

Default hotkey: `Cmd+Shift+Space`

If you want Globe/Fn as a dedicated dictation key, use the bundled Karabiner preset to map Globe to F18, then set the hotkey to `F18` in WhisprType settings.

- [extras/karabiner/fn-to-f18.json](./extras/karabiner/fn-to-f18.json)

Karabiner is optional. WhisprType works with any global shortcut.

## Configuration

Config file: `~/Library/Application Support/WhisprType/config.json`

See [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) and [config/config.example.json](./config/config.example.json).

## Architecture

- **Tauri v2** -- app shell and native API bridge
- **React + TypeScript** -- two-tab UI (Dictation, Settings)
- **Rust backend** -- config persistence, recording, transcription, paste automation
- **whisper.cpp** -- local speech-to-text via `whisper-server` (with `whisper-cli` fallback)

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Build

```bash
npm run build
npm run tauri build
```

Produces `WhisprType.app` and `.dmg` in `src-tauri/target/release/bundle/`.

See [docs/PACKAGING.md](./docs/PACKAGING.md).

## Current Limitations

- **Runtime bootstrap requires Homebrew** -- whisper-cpp and sox must be installed via `brew` before the in-app bootstrap can link them. The app does not download or compile these automatically.
- **Model download is blocking** -- downloading large models (e.g., large-v3 at ~3 GB) blocks the UI until complete. No progress indicator.
- **Microphone permission cannot be pre-checked** -- the app shows "unknown" until macOS prompts on first use.
- **No menubar mode** -- the app runs as a standard window, not a menubar utility.
- **No auto-cleanup** -- `keepAudioDays` and `keepTranscriptDays` config fields are stored but cleanup is not yet implemented.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)

## Acknowledgements

- [whisper.cpp](https://github.com/ggml-org/whisper.cpp)
- [Tauri](https://tauri.app/)
- [React](https://react.dev/)

Full credits in [docs/SOURCES.md](./docs/SOURCES.md).
