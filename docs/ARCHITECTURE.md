# Architecture

WhisprType is a macOS-first dictation product built with:

- `Tauri v2`
- `React + TypeScript`
- `Rust`
- `whisper.cpp`

## Runtime shape

- `frontend`
  - control panel
  - onboarding
  - diagnostics
  - settings
- `backend`
  - config persistence
  - environment diagnostics
  - capture orchestration
  - whisper backend management
  - paste/type automation

## Backend subsystems

### Capture

- global hotkey registration
- low-latency microphone start
- device selection
- pre-roll/post-roll handling
- non-blocking stop flow

### Transcription

- warm `whisper-server`
- `whisper-cli` fallback
- model discovery and cache awareness
- auto language by default

### Automation

- accessibility-driven paste/type for active apps
- clipboard fallback
- paste queue independent from recording state

### Diagnostics

- microphone permission guidance
- accessibility permission guidance
- backend binary detection
- config and cache path visibility

## Current implementation status

- frontend shell: implemented
- config persistence: implemented
- diagnostics skeleton: implemented
- full capture/transcription automation runtime: planned next
