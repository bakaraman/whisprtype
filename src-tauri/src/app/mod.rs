use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::Write;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::process::Stdio;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictationStatus {
    pub recording: bool,
    pub transcribing: bool,
    pub queue_depth: usize,
    pub last_error: Option<String>,
}

struct RecordingSession {
    audio_file: PathBuf,
    transcript_file: PathBuf,
    child: std::process::Child,
}

#[derive(Default)]
struct WhisperServerProcess {
    child: Option<std::process::Child>,
    model_path: Option<String>,
}

#[derive(Clone, Default)]
pub struct AppRuntime {
    recording: Arc<Mutex<Option<RecordingSession>>>,
    transcription_gate: Arc<Mutex<()>>,
    transcribing: Arc<AtomicUsize>,
    server: Arc<Mutex<WhisperServerProcess>>,
    last_error: Arc<Mutex<Option<String>>>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppRuntime::default())
        .invoke_handler(tauri::generate_handler![
            get_bootstrap_state,
            load_config,
            save_config,
            bootstrap_runtime,
            download_model,
            start_dictation,
            stop_dictation,
            toggle_dictation,
            get_dictation_status
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

fn runtime_dir() -> Result<PathBuf, String> {
    Ok(app_support_dir()?.join("runtime/whispercpp"))
}

fn models_dir() -> Result<PathBuf, String> {
    Ok(app_support_dir()?.join("models"))
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
    fs::create_dir_all(runtime_dir()?).map_err(|err| err.to_string())?;
    fs::create_dir_all(models_dir()?).map_err(|err| err.to_string())?;
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

fn accessibility_permission_state() -> String {
    match Command::new("/usr/bin/osascript")
        .args([
            "-e",
            "tell application \"System Events\" to get UI elements enabled",
        ])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|value| value.trim().to_string())
    {
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
            action: "Grant access from the WhisprType onboarding flow on first launch.".into(),
        },
        PermissionStatus {
            name: "Accessibility".into(),
            state: accessibility_permission_state(),
            summary: "Required to paste or type into the active macOS app.".into(),
            action: "Grant access from Diagnostics or in System Settings when prompted.".into(),
        },
    ]
}

fn models() -> Result<Vec<ModelStatus>, String> {
    let models_dir = models_dir()?;
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
            let path = models_dir.join(file);
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
    let runtime_dir = runtime_dir()?;
    let whisper_server_path = runtime_dir.join("whisper-server");
    let whisper_cli_path = runtime_dir.join("whisper-cli");
    Ok(BackendStatus {
        backend_ready: whisper_server_path.exists() && whisper_cli_path.exists(),
        whisper_server_path: Some(whisper_server_path.display().to_string()),
        whisper_cli_path: Some(whisper_cli_path.display().to_string()),
        cache_dir: models_dir()?.display().to_string(),
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

fn runtime_binary(name: &str) -> Result<PathBuf, String> {
    let path = runtime_dir()?.join(name);
    if path.exists() {
        Ok(path)
    } else {
        Err(format!("Runtime binary not found: {}", path.display()))
    }
}

fn find_system_binary(name: &str) -> Result<String, String> {
    let output = Command::new("/usr/bin/which")
        .arg(name)
        .output()
        .map_err(|err| err.to_string())?;
    if !output.status.success() {
        return Err(format!("Could not find {}", name));
    }
    let path = String::from_utf8(output.stdout)
        .map_err(|err| err.to_string())?
        .trim()
        .to_string();
    if path.is_empty() {
        Err(format!("Could not find {}", name))
    } else {
        Ok(path)
    }
}

fn shell_escape_single(value: &str) -> String {
    value.replace('\'', "'\\''")
}

fn set_last_error(runtime: &AppRuntime, message: Option<String>) {
    if let Ok(mut slot) = runtime.last_error.lock() {
        *slot = message;
    }
}

fn current_status(runtime: &AppRuntime) -> DictationStatus {
    let recording = runtime
        .recording
        .lock()
        .ok()
        .and_then(|session| session.as_ref().map(|_| true))
        .unwrap_or(false);
    let queue_depth = runtime.transcribing.load(Ordering::SeqCst);
    let last_error = runtime
        .last_error
        .lock()
        .ok()
        .and_then(|slot| slot.clone());

    DictationStatus {
        recording,
        transcribing: queue_depth > 0,
        queue_depth,
        last_error,
    }
}

fn emit_status(app: &AppHandle, runtime: &AppRuntime) {
    let _ = app.emit("dictation-status", current_status(runtime));
}

fn model_file_name(model: &str) -> Option<&'static str> {
    match model {
        "small" => Some("ggml-small.bin"),
        "medium" => Some("ggml-medium.bin"),
        "large-v3" => Some("ggml-large-v3.bin"),
        _ => None,
    }
}

fn model_download_url(model: &str) -> Option<&'static str> {
    match model {
        "small" => Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"),
        "medium" => Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin"),
        "large-v3" => Some("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin"),
        _ => None,
    }
}

fn selected_model_path(config: &AppConfig) -> Result<PathBuf, String> {
    let file = model_file_name(&config.transcription.model)
        .ok_or_else(|| format!("Unsupported model '{}'", config.transcription.model))?;
    let path = models_dir()?.join(file);
    if path.exists() {
        Ok(path)
    } else {
        Err(format!("Model not found at {}", path.display()))
    }
}

fn default_threads(config: &AppConfig) -> String {
    if config.transcription.threads == "auto" {
        std::thread::available_parallelism()
            .map(|count| count.get().to_string())
            .unwrap_or_else(|_| "8".into())
    } else {
        config.transcription.threads.clone()
    }
}

fn ensure_server(runtime: &AppRuntime, config: &AppConfig, model_path: &Path) -> Result<(), String> {
    let mut server = runtime.server.lock().map_err(|_| "Failed to lock server state".to_string())?;
    let desired_model = model_path.display().to_string();
    let same_model = server.model_path.as_deref() == Some(desired_model.as_str());

    if let Some(child) = server.child.as_mut() {
        if same_model {
            match child.try_wait() {
                Ok(None) => return Ok(()),
                Ok(Some(_)) | Err(_) => {
                    server.child = None;
                    server.model_path = None;
                }
            }
        } else {
            let _ = child.kill();
            let _ = child.wait();
            server.child = None;
            server.model_path = None;
        }
    }

    let server_binary = runtime_binary("whisper-server")?;
    let child = Command::new(server_binary)
        .args([
            "--host",
            "127.0.0.1",
            "--port",
            "8177",
            "--model",
            desired_model.as_str(),
            "--language",
            config.transcription.language.as_str(),
            "--no-timestamps",
            "--threads",
            default_threads(config).as_str(),
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|err| err.to_string())?;

    server.child = Some(child);
    server.model_path = Some(desired_model);

    for _ in 0..25 {
        let status = Command::new("/usr/bin/curl")
            .args([
                "-sS",
                "-o",
                "/dev/null",
                "--connect-timeout",
                "1",
                "--max-time",
                "1",
                "http://127.0.0.1:8177/",
            ])
            .status();

        if let Ok(status) = status {
            if status.success() {
                return Ok(());
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(250));
    }

    Err("whisper-server did not become ready".into())
}

fn transcribe_with_server(audio_file: &Path) -> Result<String, String> {
    let output = Command::new("/usr/bin/curl")
        .args([
            "-sS",
            "-f",
            "--connect-timeout",
            "1",
            "--max-time",
            "600",
            "-F",
            &format!("file=@{}", audio_file.display()),
            "http://127.0.0.1:8177/inference",
        ])
        .output()
        .map_err(|err| err.to_string())?;

    if !output.status.success() {
        return Err("Server transcription failed".into());
    }

    let value: Value = serde_json::from_slice(&output.stdout).map_err(|err| err.to_string())?;
    Ok(value
        .get("text")
        .and_then(|text| text.as_str())
        .unwrap_or_default()
        .trim()
        .to_string())
}

fn transcribe_with_cli(config: &AppConfig, model_path: &Path, audio_file: &Path) -> Result<String, String> {
    let cli_binary = runtime_binary("whisper-cli")?;
    let output = Command::new(cli_binary)
        .args([
            "--model",
            model_path.to_string_lossy().as_ref(),
            "--language",
            config.transcription.language.as_str(),
            "--no-timestamps",
            "--no-prints",
            "--threads",
            default_threads(config).as_str(),
            "--file",
            audio_file.to_string_lossy().as_ref(),
        ])
        .output()
        .map_err(|err| err.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn copy_to_clipboard(text: &str) -> Result<(), String> {
    let mut child = Command::new("/usr/bin/pbcopy")
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|err| err.to_string())?;
    if let Some(stdin) = child.stdin.as_mut() {
        stdin.write_all(text.as_bytes()).map_err(|err| err.to_string())?;
    }
    let status = child.wait().map_err(|err| err.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("pbcopy failed".into())
    }
}

fn send_paste_shortcut() -> Result<(), String> {
    let status = Command::new("/usr/bin/osascript")
        .args([
            "-e",
            "tell application \"System Events\" to keystroke \"v\" using command down",
        ])
        .status()
        .map_err(|err| err.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("Paste automation failed".into())
    }
}

fn type_text_slowly(text: &str) -> Result<(), String> {
    for (index, line) in text.lines().enumerate() {
        let escaped = shell_escape_single(line);
        let script = format!(
            "tell application \"System Events\" to keystroke '{}'",
            escaped
        );
        let status = Command::new("/usr/bin/osascript")
            .args(["-e", &script])
            .status()
            .map_err(|err| err.to_string())?;
        if !status.success() {
            return Err("Typing automation failed".into());
        }

        if index + 1 < text.lines().count() {
            let enter = Command::new("/usr/bin/osascript")
                .args(["-e", "tell application \"System Events\" to key code 36"])
                .status()
                .map_err(|err| err.to_string())?;
            if !enter.success() {
                return Err("Typing newline failed".into());
            }
        }
    }
    Ok(())
}

fn deliver_text(config: &AppConfig, text: &str) -> Result<(), String> {
    match config.output.mode.as_str() {
        "clipboard" => copy_to_clipboard(text),
        "typing" => type_text_slowly(text),
        _ => {
            copy_to_clipboard(text)?;
            send_paste_shortcut()
        }
    }
}

fn transcribe_and_paste(app: AppHandle, runtime: AppRuntime, audio_file: PathBuf, transcript_file: PathBuf) {
    runtime.transcribing.fetch_add(1, Ordering::SeqCst);
    emit_status(&app, &runtime);

    std::thread::spawn(move || {
        let _guard = runtime.transcription_gate.lock().ok();
        let result = (|| -> Result<(), String> {
            let config = read_config_file()?;
            let model_path = selected_model_path(&config)?;
            ensure_server(&runtime, &config, &model_path)?;

            let text = transcribe_with_server(&audio_file)
                .or_else(|_| transcribe_with_cli(&config, &model_path, &audio_file))?;

            fs::write(&transcript_file, &text).map_err(|err| err.to_string())?;
            if !text.trim().is_empty() {
                deliver_text(&config, &text)?;
            }
            Ok(())
        })();

        match result {
            Ok(_) => set_last_error(&runtime, None),
            Err(error) => set_last_error(&runtime, Some(error)),
        }

        runtime.transcribing.fetch_sub(1, Ordering::SeqCst);
        emit_status(&app, &runtime);
    });
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
            "Fresh installs should bootstrap the runtime and then download the model they want from inside the app."
                .into(),
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

#[tauri::command]
pub fn bootstrap_runtime() -> Result<BootstrapState, String> {
    let config = read_config_file()?;
    ensure_dirs(&config)?;

    for binary in ["whisper-server", "whisper-cli", "rec", "sox"] {
        let source = find_system_binary(binary)?;
        let target = runtime_dir()?.join(binary);
        if target.exists() {
            fs::remove_file(&target).map_err(|err| err.to_string())?;
        }
        std::os::unix::fs::symlink(source, target).map_err(|err| err.to_string())?;
    }

    get_bootstrap_state()
}

#[tauri::command]
pub fn download_model(model_id: String) -> Result<BootstrapState, String> {
    let file_name = model_file_name(&model_id)
        .ok_or_else(|| format!("Unsupported model '{}'", model_id))?;
    let download_url = model_download_url(&model_id)
        .ok_or_else(|| format!("No download URL for model '{}'", model_id))?;

    let destination = models_dir()?.join(file_name);
    fs::create_dir_all(models_dir()?).map_err(|err| err.to_string())?;

    let status = Command::new("/usr/bin/curl")
        .args([
            "-L",
            "--fail",
            "--output",
            destination.to_string_lossy().as_ref(),
            download_url,
        ])
        .status()
        .map_err(|err| err.to_string())?;

    if !status.success() {
        return Err(format!("Failed to download model '{}'", model_id));
    }

    get_bootstrap_state()
}

#[tauri::command]
pub fn get_dictation_status(runtime: tauri::State<AppRuntime>) -> Result<DictationStatus, String> {
    Ok(current_status(runtime.inner()))
}

#[tauri::command]
pub fn start_dictation(app: AppHandle, runtime: tauri::State<AppRuntime>) -> Result<DictationStatus, String> {
    let config = read_config_file()?;
    let _ = selected_model_path(&config)?;
    let rec_binary = runtime_binary("rec")?;
    ensure_dirs(&config)?;

    let mut session_slot = runtime
        .recording
        .lock()
        .map_err(|_| "Failed to lock recording state".to_string())?;
    if session_slot.is_some() {
        return Ok(current_status(runtime.inner()));
    }

    let stamp = Local::now().format("%Y-%m-%d_%H-%M-%S_%3f").to_string();
    let recordings_dir = PathBuf::from(&config.storage.recordings_dir);
    let audio_file = recordings_dir.join(format!("{stamp}.wav"));
    let transcript_file = recordings_dir.join(format!("{stamp}.txt"));

    let child = Command::new(rec_binary)
        .args([
            "-q",
            "--buffer",
            "256",
            "-b",
            "16",
            "-r",
            "48000",
            "-c",
            "1",
            audio_file.to_string_lossy().as_ref(),
        ])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|err| err.to_string())?;

    *session_slot = Some(RecordingSession {
        audio_file,
        transcript_file,
        child,
    });
    drop(session_slot);

    set_last_error(runtime.inner(), None);
    emit_status(&app, runtime.inner());
    Ok(current_status(runtime.inner()))
}

#[tauri::command]
pub fn stop_dictation(app: AppHandle, runtime: tauri::State<AppRuntime>) -> Result<DictationStatus, String> {
    let session = {
        let mut slot = runtime
            .recording
            .lock()
            .map_err(|_| "Failed to lock recording state".to_string())?;
        slot.take()
    };

    let Some(mut session) = session else {
        return Ok(current_status(runtime.inner()));
    };

    let _ = session.child.kill();
    let _ = session.child.wait();

    transcribe_and_paste(
        app.clone(),
        runtime.inner().clone(),
        session.audio_file,
        session.transcript_file,
    );

    emit_status(&app, runtime.inner());
    Ok(current_status(runtime.inner()))
}

#[tauri::command]
pub fn toggle_dictation(app: AppHandle, runtime: tauri::State<AppRuntime>) -> Result<DictationStatus, String> {
    if current_status(runtime.inner()).recording {
        stop_dictation(app, runtime)
    } else {
        start_dictation(app, runtime)
    }
}
