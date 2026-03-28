import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { JsonPreview } from "./components/JsonPreview";
import { Sidebar, type AppTab } from "./components/Sidebar";
import { Timeline } from "./components/Timeline";
import {
  bootstrapRuntime,
  downloadModel,
  getBootstrapState,
  getDictationStatus,
  onDictationStatus,
  revealPath,
  saveConfig,
  startDictation,
  stopDictation,
  toggleDictation,
} from "./lib/desktop";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import type { AppConfig, BootstrapState, DictationStatus, OutputMode } from "./types/app";

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("quick");
  const [state, setState] = useState<BootstrapState | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [dictationStatus, setDictationStatus] = useState<DictationStatus | null>(null);

  useEffect(() => {
    getBootstrapState().then((payload) => {
      setState(payload);
      setConfig(payload.config);
    });
    getDictationStatus().then(setDictationStatus);
    let unlisten: (() => void) | undefined;
    onDictationStatus((payload) => setDictationStatus(payload)).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!config) return;

    const shortcut = config.hotkey.combo
      .split("Cmd")
      .join("Command")
      .split("⌘")
      .join("Command")
      .split("Option")
      .join("Alt");

    const registerShortcut = async () => {
      await unregisterAll().catch(() => undefined);
      await register(shortcut, async (event) => {
        if (event.state === "Pressed") {
          const status = await toggleDictation();
          setDictationStatus(status);
        }
      });
    };

    registerShortcut().catch(() => undefined);

    return () => {
      unregisterAll().catch(() => undefined);
    };
  }, [config?.hotkey.combo]);

  const runtimeReady = state?.backend.backendReady ?? false;
  const modelInstalled = useMemo(
    () => state?.models.some((model) => model.id === config?.transcription.model && model.installed) ?? false,
    [config?.transcription.model, state?.models],
  );

  async function persistConfig() {
    if (!config) return;
    setSaving(true);
    try {
      const saved = await saveConfig(config);
      setConfig(saved);
    } finally {
      setSaving(false);
    }
  }

  function updateOutputMode(mode: OutputMode) {
    if (!config) return;
    setConfig({
      ...config,
      output: {
        ...config.output,
        mode,
      },
    });
  }

  async function refreshBootstrap() {
    const payload = await getBootstrapState();
    setState(payload);
    setConfig(payload.config);
  }

  async function runBootstrap() {
    setBusyAction("bootstrap");
    try {
      const payload = await bootstrapRuntime();
      setState(payload);
      setConfig(payload.config);
    } finally {
      setBusyAction(null);
    }
  }

  async function runDownload(modelId: string) {
    setBusyAction(`download:${modelId}`);
    try {
      const payload = await downloadModel(modelId);
      setState(payload);
      setConfig(payload.config);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStartStop() {
    if (dictationStatus?.recording) {
      setDictationStatus(await stopDictation());
    } else {
      setDictationStatus(await startDictation());
    }
  }

  if (!state || !config) {
    return (
      <main className="loading-view">
        <div className="loading-spinner" />
        <div>
          <p className="caption">WhisprType</p>
          <h1>Loading control panel…</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="window-shell">
      <Sidebar activeTab={activeTab} onSelect={setActiveTab} />

      <section className="content-shell">
        <header className="toolbar">
          <div>
            <p className="caption">macOS dictation</p>
            <h2>WhisprType</h2>
          </div>

          <div className="toolbar__actions">
            <button className="toolbar-button" onClick={() => revealPath(state.backend.configPath)} type="button">
              Show Config
            </button>
            <button className="toolbar-button" onClick={() => revealPath(config.storage.recordingsDir)} type="button">
              Show Recordings
            </button>
            <button className="toolbar-button is-primary" onClick={persistConfig} type="button">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </header>

        <section className="overview-strip">
          <div className="metric">
            <span className="metric__label">Hotkey</span>
            <strong>{config.hotkey.combo}</strong>
          </div>
          <div className="metric">
            <span className="metric__label">Mode</span>
            <strong>{config.hotkey.mode === "toggle" ? "Toggle Recording" : "Push to Talk"}</strong>
          </div>
          <div className="metric">
            <span className="metric__label">Backend</span>
            <strong>{runtimeReady ? "Ready" : "Bootstrap Needed"}</strong>
          </div>
          <div className="metric">
            <span className="metric__label">Model</span>
            <strong>{config.transcription.model}</strong>
          </div>
        </section>

        {activeTab === "quick" ? (
          <div className="section-stack">
            <section className="panel panel--plain">
              <div className="panel__header">
                <div>
                  <p className="caption">Quick Dictation</p>
                  <h3>Primary flow</h3>
                </div>
                <div className="toolbar__actions">
                  <button className="toolbar-button" onClick={refreshBootstrap} type="button">
                    Refresh
                  </button>
                  <button
                    className="toolbar-button"
                    disabled={busyAction === "bootstrap"}
                    onClick={runBootstrap}
                    type="button"
                  >
                    {busyAction === "bootstrap" ? "Bootstrapping…" : "Bootstrap Runtime"}
                  </button>
                  <button
                    className="toolbar-button is-primary"
                    disabled={!runtimeReady || !modelInstalled}
                    onClick={handleStartStop}
                    type="button"
                  >
                    {dictationStatus?.recording ? "Stop Dictation" : "Start Dictation"}
                  </button>
                </div>
              </div>
              <div className="info-banner">
                <strong>Status:</strong>{" "}
                {dictationStatus?.recording
                  ? "Recording"
                  : dictationStatus?.transcribing
                    ? `Transcribing (${dictationStatus.queueDepth})`
                    : "Idle"}
                {dictationStatus?.lastError ? <span> · {dictationStatus.lastError}</span> : null}
              </div>
              <div className="step-list">
                <div className="step-row">
                  <span>1</span>
                  <div>
                    <strong>Press the hotkey</strong>
                    <p>Default is {config.hotkey.combo}. Globe/Fn can be mapped to F18 with Karabiner.</p>
                  </div>
                </div>
                <div className="step-row">
                  <span>2</span>
                  <div>
                    <strong>Speak naturally</strong>
                    <p>WhisprType records locally, uses an app-managed whisper runtime, then queues output.</p>
                  </div>
                </div>
                <div className="step-row">
                  <span>3</span>
                  <div>
                    <strong>Paste when ready</strong>
                    <p>Finished transcripts can land immediately, even if another recording is still live.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel panel--plain">
              <div className="panel__header">
                <div>
                  <p className="caption">Recent transcripts</p>
                  <h3>History</h3>
                </div>
              </div>
              <Timeline items={state.recentTranscripts} />
            </section>
          </div>
        ) : null}

        {activeTab === "hotkeys" ? (
          <div className="section-stack">
            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="caption">Hotkeys & Behavior</p>
                  <h3>Input and output</h3>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Shortcut</span>
                  <input
                    value={config.hotkey.combo}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        hotkey: { ...config.hotkey, combo: event.currentTarget.value },
                      })
                    }
                  />
                </label>

                <label className="field">
                  <span>Hotkey mode</span>
                  <select
                    value={config.hotkey.mode}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        hotkey: { ...config.hotkey, mode: event.currentTarget.value as AppConfig["hotkey"]["mode"] },
                      })
                    }
                  >
                    <option value="toggle">Toggle Recording</option>
                    <option value="ptt">Push to Talk</option>
                  </select>
                </label>

                <div className="field field--full">
                  <span>Output mode</span>
                  <div className="segmented">
                    {(["immediate", "clipboard", "typing"] as OutputMode[]).map((mode) => (
                      <button
                        key={mode}
                        className={config.output.mode === mode ? "segmented__item is-active" : "segmented__item"}
                        onClick={() => updateOutputMode(mode)}
                        type="button"
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="checkbox-row field--full">
                  <input
                    checked={config.output.pasteWhileRecording}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        output: { ...config.output, pasteWhileRecording: event.currentTarget.checked },
                      })
                    }
                    type="checkbox"
                  />
                  <span>Paste finished transcripts immediately, even while another recording is still running.</span>
                </label>
              </div>
            </section>

            <JsonPreview title="Current behavior config" value={config} />
          </div>
        ) : null}

        {activeTab === "models" ? (
          <div className="section-stack">
            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="caption">Models & Performance</p>
                  <h3>Backend choices</h3>
                </div>
                <button
                  className="toolbar-button"
                  disabled={busyAction === `download:${config.transcription.model}`}
                  onClick={() => runDownload(config.transcription.model)}
                  type="button"
                >
                  {busyAction === `download:${config.transcription.model}` ? "Downloading…" : "Download selected model"}
                </button>
              </div>
              <div className="plain-list">
                {state.models.map((model) => (
                  <article className="plain-list__row" key={model.id}>
                    <div>
                      <strong>{model.label}</strong>
                      <p>{model.recommendedFor}</p>
                    </div>
                    <div className="row-meta">
                      <span className={model.installed ? "badge is-success" : "badge"}>{model.installed ? "Installed" : "Optional"}</span>
                      <code>{model.path ?? "Not downloaded yet"}</code>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="form-grid">
                <label className="field">
                  <span>Preferred model</span>
                  <select
                    value={config.transcription.model}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        transcription: { ...config.transcription, model: event.currentTarget.value },
                      })
                    }
                  >
                    <option value="small">small</option>
                    <option value="medium">medium</option>
                    <option value="large-v3">large-v3</option>
                  </select>
                </label>

                <label className="field">
                  <span>Language</span>
                  <input
                    value={config.transcription.language}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        transcription: { ...config.transcription, language: event.currentTarget.value },
                      })
                    }
                  />
                </label>

                <label className="field">
                  <span>Threads</span>
                  <input
                    value={config.transcription.threads}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        transcription: { ...config.transcription, threads: event.currentTarget.value },
                      })
                    }
                  />
                </label>

                <label className="field">
                  <span>Idle on Battery</span>
                  <input
                    type="number"
                    value={config.transcription.serverIdleSecondsBattery}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        transcription: {
                          ...config.transcription,
                          serverIdleSecondsBattery: Number(event.currentTarget.value),
                        },
                      })
                    }
                  />
                </label>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "permissions" ? (
          <div className="section-stack">
            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="caption">Permissions & Diagnostics</p>
                  <h3>macOS health</h3>
                </div>
              </div>
              <div className="plain-list">
                {state.permissions.map((permission) => (
                  <article className="plain-list__row" key={permission.name}>
                    <div>
                      <strong>{permission.name}</strong>
                      <p>{permission.summary}</p>
                    </div>
                    <div className="row-meta">
                      <span className={permission.state === "granted" ? "badge is-success" : "badge is-warning"}>
                        {permission.state}
                      </span>
                      <small>{permission.action}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="caption">Backend status</p>
                  <h3>whisper.cpp paths</h3>
                </div>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>whisper-server</dt>
                  <dd>{state.backend.whisperServerPath ?? "Not bootstrapped yet"}</dd>
                </div>
                <div>
                  <dt>whisper-cli</dt>
                  <dd>{state.backend.whisperCliPath ?? "Not bootstrapped yet"}</dd>
                </div>
                <div>
                  <dt>Models directory</dt>
                  <dd>{state.backend.cacheDir}</dd>
                </div>
                <div>
                  <dt>App Support</dt>
                  <dd>{state.backend.appSupportDir}</dd>
                </div>
                <div>
                  <dt>Bootstrap</dt>
                  <dd>{state.backend.backendReady ? "Runtime ready" : "Needs first-run runtime download"}</dd>
                </div>
              </dl>
            </section>
          </div>
        ) : null}

        {activeTab === "advanced" ? (
          <div className="section-stack">
            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="caption">Advanced</p>
                  <h3>Capture and storage</h3>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Input device</span>
                  <input
                    value={config.capture.inputDevice}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        capture: { ...config.capture, inputDevice: event.currentTarget.value },
                      })
                    }
                  />
                </label>

                <label className="field">
                  <span>Pre-roll</span>
                  <input
                    type="number"
                    value={config.capture.preRollMs}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        capture: { ...config.capture, preRollMs: Number(event.currentTarget.value) },
                      })
                    }
                  />
                </label>

                <label className="field">
                  <span>Post-roll</span>
                  <input
                    type="number"
                    value={config.capture.postRollMs}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        capture: { ...config.capture, postRollMs: Number(event.currentTarget.value) },
                      })
                    }
                  />
                </label>

                <label className="field">
                  <span>Keep audio days</span>
                  <input
                    type="number"
                    value={config.storage.keepAudioDays}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        storage: { ...config.storage, keepAudioDays: Number(event.currentTarget.value) },
                      })
                    }
                  />
                </label>

                <label className="field">
                  <span>Keep transcript days</span>
                  <input
                    type="number"
                    value={config.storage.keepTranscriptDays}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        storage: {
                          ...config.storage,
                          keepTranscriptDays: Number(event.currentTarget.value),
                        },
                      })
                    }
                  />
                </label>

                <label className="checkbox-row field--full">
                  <input
                    checked={config.ui.showHud}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        ui: { ...config.ui, showHud: event.currentTarget.checked },
                      })
                    }
                    type="checkbox"
                  />
                  <span>Show a compact HUD while recording and transcribing.</span>
                </label>
              </div>
            </section>

            <JsonPreview title="Advanced config" value={config} />
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default App;
