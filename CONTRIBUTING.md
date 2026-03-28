# Contributing

Thanks for considering a contribution.

## Development Setup

```bash
./scripts/bootstrap-macos.sh
npm install
npm run tauri dev
```

You also need whisper-cpp and SoX for the runtime:

```bash
brew install whisper-cpp sox
```

## Pull Requests

- Keep changes focused
- Include screenshots for UI changes
- Update docs when config or behavior changes
- Prefer small, reviewable pull requests

## Project Priorities

- Reliable dictation pipeline (record, transcribe, paste)
- macOS permission handling
- Bootstrap and model download UX
- whisper.cpp integration quality
- Packaging for clean installs

## Reporting Bugs

Please include:

- macOS version and chip type
- Whether whisper-cpp and sox are installed (`which whisper-server whisper-cli rec sox`)
- The active hotkey
- Whether Microphone and Accessibility permissions are granted
- Any error messages shown in the Dictation tab
