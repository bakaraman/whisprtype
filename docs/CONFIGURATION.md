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

### `capture`

- `inputDevice`: `"default"` or a specific device identifier
- `preRollMs`: pre-buffer before hotkey start (ms)
- `postRollMs`: trailing capture after stop (ms)

### `ui`

- `showHud`: show a compact HUD while recording
