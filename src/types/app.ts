export type PermissionState = "granted" | "required" | "unknown";
export type HotkeyMode = "toggle" | "ptt";
export type OutputMode = "immediate" | "clipboard" | "typing";

export interface HotkeyConfig {
  mode: HotkeyMode;
  combo: string;
}

export interface CaptureConfig {
  inputDevice: string;
  preRollMs: number;
  postRollMs: number;
}

export interface TranscriptionConfig {
  engine: "whispercpp";
  model: string;
  language: string;
  threads: string;
  serverIdleSecondsBattery: number;
  serverIdleSecondsAC: number;
}

export interface OutputConfig {
  mode: OutputMode;
  pasteWhileRecording: boolean;
}

export interface StorageConfig {
  recordingsDir: string;
  keepAudioDays: number;
  keepTranscriptDays: number;
}

export interface UiConfig {
  showHud: boolean;
}

export interface AppConfig {
  hotkey: HotkeyConfig;
  capture: CaptureConfig;
  transcription: TranscriptionConfig;
  output: OutputConfig;
  storage: StorageConfig;
  ui: UiConfig;
}

export interface ModelStatus {
  id: string;
  label: string;
  installed: boolean;
  recommendedFor: string;
  path?: string | null;
}

export interface PermissionStatus {
  name: string;
  state: PermissionState;
  summary: string;
  action: string;
}

export interface BackendStatus {
  whisperServerPath?: string | null;
  whisperCliPath?: string | null;
  backendReady: boolean;
  cacheDir: string;
  appSupportDir: string;
  configPath: string;
}

export interface TranscriptEntry {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  sourcePath: string;
}

export interface BootstrapState {
  appName: string;
  version: string;
  tagline: string;
  config: AppConfig;
  permissions: PermissionStatus[];
  models: ModelStatus[];
  backend: BackendStatus;
  recentTranscripts: TranscriptEntry[];
  quickTips: string[];
}
