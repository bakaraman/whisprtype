# Configuration

Config file location:

```
~/Library/Application Support/WhisprType/config.json
```

Created with defaults on first launch.

## Active fields

These fields are used by the backend and exposed in the Settings UI:

### `hotkey`

- `mode`: `"toggle"` or `"ptt"` (push-to-talk)
- `combo`: global shortcut string, e.g. `"Cmd+Shift+Space"`

### `transcription`

- `engine`: always `"whispercpp"`
- `model`: `"small"`, `"medium"`, or `"large-v3"`
- `language`: `"auto"` or an explicit language code
- `threads`: `"auto"` or a numeric string

### `output`

- `mode`: `"immediate"` (clipboard + paste), `"clipboard"` (copy only), or `"typing"` (character-by-character)
- `pasteWhileRecording`: `true` to paste finished transcripts while another recording is running

### `storage`

- `recordingsDir`: directory for audio and transcript files

## Stored but not yet active

These fields are saved to the config file but not currently used by the backend:

- `capture.inputDevice` -- reserved for future device selection
- `capture.preRollMs` -- reserved for pre-buffer
- `capture.postRollMs` -- reserved for post-buffer
- `transcription.serverIdleSecondsBattery` -- reserved for server idle timeout on battery
- `transcription.serverIdleSecondsAC` -- reserved for server idle timeout on AC power
- `storage.keepAudioDays` -- reserved for auto-cleanup of old recordings
- `storage.keepTranscriptDays` -- reserved for auto-cleanup of old transcripts
- `ui.showHud` -- reserved for a recording HUD overlay
