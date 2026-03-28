import type { BootstrapState } from "../types/app";

export const mockBootstrapState: BootstrapState = {
  appName: "WhisprType",
  version: "0.1.0",
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
      state: "unknown",
      summary: "Required for local dictation capture.",
      action: "macOS will prompt on first recording attempt.",
    },
    {
      name: "Accessibility",
      state: "required",
      summary: "Required to paste or type into the active macOS app.",
      action: "System Settings > Privacy & Security > Accessibility",
    },
  ],
  models: [
    {
      id: "small",
      label: "small",
      installed: false,
      recommendedFor: "Fast drafts and short commands",
      path: null,
    },
    {
      id: "medium",
      label: "medium",
      installed: false,
      recommendedFor: "Balanced local accuracy",
      path: null,
    },
    {
      id: "large-v3",
      label: "large-v3",
      installed: false,
      recommendedFor: "Highest accuracy for multilingual dictation",
      path: null,
    },
  ],
  backend: {
    whisperServerPath: null,
    whisperCliPath: null,
    backendReady: false,
    cacheDir: "~/Library/Application Support/WhisprType/models",
    appSupportDir: "~/Library/Application Support/WhisprType",
    configPath: "~/Library/Application Support/WhisprType/config.json",
  },
};
