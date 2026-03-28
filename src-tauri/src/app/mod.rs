use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HotkeyConfig {
    pub mode: String,
    pub combo: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureConfig {
    pub input_device: String,
    pub pre_roll_ms: u32,
    pub post_roll_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionConfig {
    pub engine: String,
    pub model: String,
    pub language: String,
    pub threads: String,
    pub server_idle_seconds_battery: u32,
    pub server_idle_seconds_ac: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputConfig {
    pub mode: String,
    pub paste_while_recording: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageConfig {
    pub recordings_dir: String,
    pub keep_audio_days: u32,
    pub keep_transcript_days: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiConfig {
    pub show_hud: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub hotkey: HotkeyConfig,
    pub capture: CaptureConfig,
    pub transcription: TranscriptionConfig,
    pub output: OutputConfig,
    pub storage: StorageConfig,
    pub ui: UiConfig,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    pub id: String,
    pub label: String,
    pub installed: bool,
    pub recommended_for: String,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionStatus {
    pub name: String,
    pub state: String,
    pub summary: String,
    pub action: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendStatus {
    pub whisper_server_path: Option<String>,
    pub whisper_cli_path: Option<String>,
    pub backend_ready: bool,
    pub cache_dir: String,
    pub app_support_dir: String,
    pub config_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptEntry {
    pub id: String,
    pub title: String,
    pub preview: String,
    pub created_at: String,
    pub source_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapState {
    pub app_name: String,
    pub version: String,
    pub tagline: String,
    pub config: AppConfig,
    pub permissions: Vec<PermissionStatus>,
    pub models: Vec<ModelStatus>,
    pub backend: BackendStatus,
    pub recent_transcripts: Vec<TranscriptEntry>,
    pub quick_tips: Vec<String>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_bootstrap_state,
            load_config,
            save_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running WhisprType");
}

fn home_dir() -> Result<PathBuf, String> {
    env::var("HOME")
        .map(PathBuf::from)
        .map_err(|_| "Could not resolve HOME directory".to_string())
}

fn app_support_dir() -> Result<PathBuf, String> {
    Ok(home_dir()?.join("Library/Application Support/WhisprType"))
}

fn config_path() -> Result<PathBuf, String> {
    Ok(app_support_dir()?.join("config.json"))
}

fn cache_dir() -> Result<PathBuf, String> {
    Ok(home_dir()?.join(".cache/whisper-cpp"))
}

fn default_recordings_dir() -> Result<PathBuf, String> {
    Ok(home_dir()?.join("Documents/WhisprType/Recordings"))
}

fn default_config() -> Result<AppConfig, String> {
    Ok(AppConfig {
        hotkey: HotkeyConfig {
            mode: "toggle".into(),
            combo: "Cmd+Shift+Space".into(),
        },
        capture: CaptureConfig {
            input_device: "default".into(),
            pre_roll_ms: 350,
            post_roll_ms: 200,
        },
        transcription: TranscriptionConfig {
            engine: "whispercpp".into(),
            model: "large-v3".into(),
            language: "auto".into(),
            threads: "auto".into(),
            server_idle_seconds_battery: 75,
            server_idle_seconds_ac: 300,
        },
        output: OutputConfig {
            mode: "immediate".into(),
            paste_while_recording: true,
        },
        storage: StorageConfig {
            recordings_dir: default_recordings_dir()?.display().to_string(),
            keep_audio_days: 14,
            keep_transcript_days: 30,
        },
        ui: UiConfig { show_hud: true },
    })
}

fn ensure_dirs(config: &AppConfig) -> Result<(), String> {
    fs::create_dir_all(app_support_dir()?).map_err(|err| err.to_string())?;
    fs::create_dir_all(PathBuf::from(&config.storage.recordings_dir))
        .map_err(|err| err.to_string())?;
    Ok(())
}

fn read_config_file() -> Result<AppConfig, String> {
    let path = config_path()?;
    if !path.exists() {
        let config = default_config()?;
        write_config_file(&config)?;
        return Ok(config);
    }

    let raw = fs::read_to_string(path).map_err(|err| err.to_string())?;
    serde_json::from_str(&raw).map_err(|err| err.to_string())
}

fn write_config_file(config: &AppConfig) -> Result<(), String> {
    ensure_dirs(config)?;
    let path = config_path()?;
    let json = serde_json::to_string_pretty(config).map_err(|err| err.to_string())?;
    fs::write(path, json).map_err(|err| err.to_string())
}

fn run_command(program: &str, args: &[&str]) -> Option<String> {
    let output = Command::new(program).args(args).output().ok()?;
    if !output.status.success() {
        return None;
    }

    let text = String::from_utf8(output.stdout).ok()?;
    let trimmed = text.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn which(binary: &str) -> Option<String> {
    run_command("/usr/bin/which", &[binary])
}

fn accessibility_permission_state() -> String {
    match run_command(
        "/usr/bin/osascript",
        &[
            "-e",
            "tell application \"System Events\" to get UI elements enabled",
        ],
    ) {
        Some(value) if value.to_lowercase().contains("true") => "granted".into(),
        Some(_) => "required".into(),
        None => "unknown".into(),
    }
}

fn microphone_permission_state() -> String {
    "required".into()
}

fn permissions() -> Vec<PermissionStatus> {
    vec![
        PermissionStatus {
            name: "Microphone".into(),
            state: microphone_permission_state(),
            summary: "Required for local dictation capture.".into(),
            action: "Open System Settings → Privacy & Security → Microphone and enable WhisprType."
                .into(),
        },
        PermissionStatus {
            name: "Accessibility".into(),
            state: accessibility_permission_state(),
            summary: "Required to paste or type into the active macOS app.".into(),
            action:
                "Open System Settings → Privacy & Security → Accessibility and enable WhisprType."
                    .into(),
        },
    ]
}

fn models() -> Result<Vec<ModelStatus>, String> {
    let cache = cache_dir()?;
    let candidates = vec![
        (
            "small",
            "ggml-small.bin",
            "Fast drafts, commands, and chat replies",
        ),
        (
            "medium",
            "ggml-medium.bin",
            "Balanced local accuracy for longer notes",
        ),
        (
            "large-v3",
            "ggml-large-v3.bin",
            "Highest local accuracy for multilingual dictation",
        ),
    ];

    Ok(candidates
        .into_iter()
        .map(|(id, file, recommended_for)| {
            let path = cache.join(file);
            ModelStatus {
                id: id.into(),
                label: id.into(),
                installed: path.exists(),
                recommended_for: recommended_for.into(),
                path: if path.exists() {
                    Some(path.display().to_string())
                } else {
                    None
                },
            }
        })
        .collect())
}

fn backend_status() -> Result<BackendStatus, String> {
    let whisper_server_path = which("whisper-server");
    let whisper_cli_path = which("whisper-cli");
    Ok(BackendStatus {
        backend_ready: whisper_server_path.is_some() && whisper_cli_path.is_some(),
        whisper_server_path,
        whisper_cli_path,
        cache_dir: cache_dir()?.display().to_string(),
        app_support_dir: app_support_dir()?.display().to_string(),
        config_path: config_path()?.display().to_string(),
    })
}

fn transcript_entries(recordings_dir: &Path) -> Vec<TranscriptEntry> {
    let mut items = Vec::new();
    let entries = match fs::read_dir(recordings_dir) {
        Ok(entries) => entries,
        Err(_) => return items,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) != Some("txt") {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };

        let created_at = metadata
            .modified()
            .ok()
            .map(DateTime::<Local>::from)
            .map(|time| time.format("%Y-%m-%d %H:%M").to_string())
            .unwrap_or_else(|| "Unknown".into());

        let body = fs::read_to_string(&path).unwrap_or_default();
        let preview = body
            .split_whitespace()
            .take(18)
            .collect::<Vec<_>>()
            .join(" ");
        let title = path
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("Transcript")
            .replace('_', " ");

        items.push(TranscriptEntry {
            id: path.display().to_string(),
            title,
            preview,
            created_at,
            source_path: path.display().to_string(),
        });
    }

    items.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    items.truncate(8);
    items
}

#[tauri::command]
pub fn get_bootstrap_state() -> Result<BootstrapState, String> {
    let config = read_config_file()?;
    let version = env!("CARGO_PKG_VERSION").to_string();

    Ok(BootstrapState {
        app_name: "WhisprType".into(),
        version,
        tagline: "Press a hotkey. Speak. Let local AI type anywhere on macOS.".into(),
        permissions: permissions(),
        models: models()?,
        backend: backend_status()?,
        recent_transcripts: transcript_entries(Path::new(&config.storage.recordings_dir)),
        quick_tips: vec![
            "Use toggle mode if you mostly dictate into editors and chat apps.".into(),
            "Use the bundled Karabiner preset if you want Globe/Fn to act as a dedicated dictation trigger."
                .into(),
            "Keep paste-while-recording enabled if you want finished transcripts to land immediately.".into(),
        ],
        config,
    })
}

#[tauri::command]
pub fn load_config() -> Result<AppConfig, String> {
    read_config_file()
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<AppConfig, String> {
    write_config_file(&config)?;
    Ok(config)
}
