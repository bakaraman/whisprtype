import type { BootstrapState } from "../types/app";

export const mockBootstrapState: BootstrapState = {
  appName: "WhisprType",
  version: "0.1.0",
  tagline: "Press a hotkey. Speak. Let local AI type anywhere on macOS.",
  config: {
    hotkey: {
      mode: "toggle",
      combo: "Cmd+Shift+Space",
    },
    capture: {
      inputDevice: "default",
      preRollMs: 350,
      postRollMs: 200,
    },
    transcription: {
      engine: "whispercpp",
      model: "large-v3",
      language: "auto",
      threads: "auto",
      serverIdleSecondsBattery: 75,
      serverIdleSecondsAC: 300,
    },
    output: {
      mode: "immediate",
      pasteWhileRecording: true,
    },
    storage: {
      recordingsDir: "~/Documents/WhisprType/Recordings",
      keepAudioDays: 14,
      keepTranscriptDays: 30,
    },
    ui: {
      showHud: true,
    },
  },
  permissions: [
    {
      name: "Microphone",
      state: "required",
      summary: "Grant microphone access so WhisprType can capture speech.",
      action: "Open System Settings → Privacy & Security → Microphone",
    },
    {
      name: "Accessibility",
      state: "required",
      summary: "Needed to paste or type into the active app.",
      action: "Open System Settings → Privacy & Security → Accessibility",
    },
  ],
  models: [
    {
      id: "small",
      label: "small",
      installed: true,
      recommendedFor: "Fast drafts and short commands",
      path: "~/.cache/whisper-cpp/ggml-small.bin",
    },
    {
      id: "large-v3",
      label: "large-v3",
      installed: true,
      recommendedFor: "Highest accuracy for mixed Turkish and English dictation",
      path: "~/.cache/whisper-cpp/ggml-large-v3.bin",
    },
    {
      id: "medium",
      label: "medium",
      installed: false,
      recommendedFor: "Balanced local accuracy",
      path: null,
    },
  ],
  backend: {
    whisperServerPath: "/opt/homebrew/bin/whisper-server",
    whisperCliPath: "/opt/homebrew/bin/whisper-cli",
    backendReady: true,
    cacheDir: "~/.cache/whisper-cpp",
    appSupportDir: "~/Library/Application Support/WhisprType",
    configPath: "~/Library/Application Support/WhisprType/config.json",
  },
  recentTranscripts: [
    {
      id: "1",
      title: "Standup notes",
      preview: "Shipped the queue fix. Next up is polishing onboarding and packaging.",
      createdAt: "2026-03-28 16:10",
      sourcePath: "~/Documents/WhisprType/Recordings/2026-03-28_16-10-04_001.txt",
    },
    {
      id: "2",
      title: "Email draft",
      preview: "Thanks for the update. I reviewed the release notes and pushed the hotkey changes.",
      createdAt: "2026-03-28 14:42",
      sourcePath: "~/Documents/WhisprType/Recordings/2026-03-28_14-42-13_002.txt",
    },
  ],
  quickTips: [
    "Use toggle mode if you mostly dictate into editors and chat apps.",
    "Map Globe to F18 with the bundled Karabiner preset if you want a dedicated dictation key.",
    "Keep paste-while-recording enabled if you want finished transcripts to land immediately.",
  ],
};
