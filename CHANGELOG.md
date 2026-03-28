# Changelog

## 0.1.0

- Tauri v2 + React + Rust desktop app for macOS
- Two-tab UI: Dictation (status, setup checklist) and Settings (hotkey, output, model, storage)
- Global hotkey registration with toggle and push-to-talk modes
- Audio capture via SoX `rec`
- Local transcription via whisper.cpp (server mode with CLI fallback)
- Three output modes: immediate paste, clipboard, character-by-character typing
- In-app bootstrap to link system-installed whisper-cpp and SoX binaries
- In-app model download (small, medium, large-v3) from HuggingFace
- macOS permission detection (Accessibility via osascript, Microphone on first use)
- Config persistence to `~/Library/Application Support/WhisprType/config.json`
- Bundled Karabiner preset for Globe/Fn to F18 mapping
- macOS `.app` and `.dmg` build targets
