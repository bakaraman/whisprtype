# Contributing

Thanks for considering a contribution.

## Development Setup

```bash
./scripts/bootstrap-macos.sh
npm install
npm run tauri dev
```

## Pull Requests

- Keep changes focused
- Include screenshots for UI changes
- Update docs when config or behavior changes
- Prefer small, reviewable pull requests over giant dumps

## Project Priorities

- Reliable dictation workflow
- macOS permission UX
- paste-anywhere behavior
- whisper.cpp integration quality
- packaging and onboarding polish

## Reporting Bugs

Please include:

- macOS version
- chip type
- whether `whisper-server` and `whisper-cli` are installed
- the active hotkey
- whether microphone and accessibility permissions are granted
