# Architecture

WhisprType is a macOS dictation app built with Tauri v2, React + TypeScript, and Rust.

## Stack

- **Frontend**: React 19, TypeScript, Vite 7
- **Backend**: Rust (Tauri v2 commands)
- **Transcription**: whisper.cpp (`whisper-server` with `whisper-cli` fallback)
- **Audio capture**: SoX `rec` command
- **Output automation**: macOS `osascript` (System Events)

## Frontend

Two-tab UI:

- **Dictation** -- status, start/stop, setup checklist (bootstrap, model download, permissions)
- **Settings** -- hotkey, output mode, model selection, language, threads, recordings directory, paths

Components:

- `App.tsx` -- root component, all state management
- `Sidebar.tsx` -- navigation (2 tabs)

IPC bridge (`lib/desktop.ts`) wraps Tauri `invoke()` calls. Falls back to mock data when running outside the Tauri runtime (development only).

## Backend (Rust)

All backend logic lives in `src-tauri/src/app/mod.rs`.

### Tauri commands

| Command | Purpose |
|---------|---------|
| `get_bootstrap_state` | Returns config, permissions, models, backend status |
| `save_config` | Writes config to disk |
| `load_config` | Reads config from disk |
| `bootstrap_runtime` | Symlinks system binaries into app runtime directory |
| `download_model` | Downloads a whisper model from HuggingFace via curl |
| `start_dictation` | Starts `rec` process to capture audio |
| `stop_dictation` | Kills `rec`, queues transcription in a background thread |
| `toggle_dictation` | Convenience wrapper for start/stop |
| `get_dictation_status` | Returns current recording/transcribing state |

### Runtime directory

```
~/Library/Application Support/WhisprType/
├── config.json
├── runtime/whispercpp/
│   ├── whisper-server -> (symlink to system binary)
│   ├── whisper-cli -> (symlink to system binary)
│   ├── rec -> (symlink to system binary)
│   └── sox -> (symlink to system binary)
└── models/
    ├── ggml-small.bin
    ├── ggml-medium.bin
    └── ggml-large-v3.bin
```

### Transcription flow

1. `stop_dictation` kills the `rec` process
2. Background thread acquires transcription gate (serializes transcription)
3. `ensure_server` starts or reuses `whisper-server` on `127.0.0.1:8177`
4. Audio is POSTed to `/inference` endpoint
5. Falls back to `whisper-cli` if server transcription fails
6. Result is delivered via clipboard + paste, clipboard only, or character-by-character typing

### Permission checks

- **Accessibility**: checked via `osascript` (`UI elements enabled`)
- **Microphone**: macOS prompts on first recording attempt
