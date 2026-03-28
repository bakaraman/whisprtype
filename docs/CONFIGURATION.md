# Configuration

WhisprType stores config in:

```text
~/Library/Application Support/WhisprType/config.json
```

## Fields

### `hotkey`

- `mode`: `toggle` or `ptt`
- `combo`: global shortcut string

### `capture`

- `inputDevice`: `default` or a device identifier
- `preRollMs`: pre-buffer before hotkey start
- `postRollMs`: trailing capture after stop

### `transcription`

- `engine`: currently `whispercpp`
- `model`: `small`, `medium`, `large-v3`
- `language`: `auto` or explicit language code
- `threads`: `auto` or numeric string
- `serverIdleSecondsBattery`
- `serverIdleSecondsAC`

WhisprType expects runtime binaries and models under its own app-managed directories in `~/Library/Application Support/WhisprType`, not a preinstalled system-level setup.

### `output`

- `mode`: `immediate`, `clipboard`, `typing`
- `pasteWhileRecording`: whether a finished transcript may paste while another recording is live

### `storage`

- `recordingsDir`
- `keepAudioDays`
- `keepTranscriptDays`

### `ui`

- `showHud`
